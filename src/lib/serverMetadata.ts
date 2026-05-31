import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/config/app";
import { isCommercialCollaborationSlug } from "@/lib/commercial";
import type { Database } from "@/types/database";

type CategoryRelation =
  | {
      accent_color: string | null;
      id: string;
      name: string | null;
      slug: string | null;
      tone: string | null;
    }
  | {
      accent_color: string | null;
      id: string;
      name: string | null;
      slug: string | null;
      tone: string | null;
    }[]
  | null;

export type SeoFact = Pick<
  Database["public"]["Tables"]["facts"]["Row"],
  | "content"
  | "event_day"
  | "event_month"
  | "event_year"
  | "hook"
  | "id"
  | "long_content"
  | "published_at"
  | "seo_description"
  | "seo_title"
  | "slug"
  | "source"
  | "source_url"
  | "title"
  | "updated_at"
> & {
  categories: CategoryRelation;
};

export type SeoTheme = Pick<
  Database["public"]["Tables"]["categories"]["Row"],
  "accent_color" | "id" | "name" | "slug" | "tone" | "updated_at"
> & {
  factsCount?: number;
};

const PUBLISHED_FACT_SELECT =
  "id,slug,title,hook,content,long_content,source,source_url,seo_title,seo_description,event_day,event_month,event_year,published_at,updated_at,categories(id,name,slug,tone,accent_color)";

export function createSupabaseMetadataClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.startsWith("sb_secret_")) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function stripToDescription(value?: string | null, maxLength = 156) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function firstCategory(categories: CategoryRelation) {
  return Array.isArray(categories) ? categories[0] : categories;
}

export function getSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null);

  try {
    return new URL(configuredUrl ?? siteConfig.fallbackUrl).origin;
  } catch {
    return siteConfig.fallbackUrl;
  }
}

export function buildCanonicalUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

export const absoluteUrl = buildCanonicalUrl;

export function titleizeSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildDefaultMetadata({
  canonicalPath,
  description,
  noindex = false,
  title,
}: {
  canonicalPath: string;
  description: string;
  noindex?: boolean;
  title: string;
}): Metadata {
  const canonical = buildCanonicalUrl(canonicalPath);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      siteName: siteConfig.name,
      type: "website",
      url: canonical,
    },
    robots: noindex ? { follow: false, index: false } : undefined,
    twitter: {
      card: "summary",
      description,
      title,
    },
  };
}

export function buildFactMetadata(fact: SeoFact | null, slug: string): Metadata {
  const fallbackTitle = titleizeSlug(slug);
  const title = stripToDescription(
    fact?.seo_title || fact?.title || fallbackTitle,
    90,
  );
  const description = stripToDescription(
    fact?.seo_description || fact?.hook || fact?.content || fact?.long_content,
  ) || "Un fait court et mémorable à découvrir sur Grumm.";
  const canonicalPath = `/fait/${fact?.slug ?? slug}`;

  return buildDefaultMetadata({
    canonicalPath,
    description,
    title,
  });
}

export function buildThemeMetadata(theme: SeoTheme | null, slug?: string): Metadata {
  const themeName = theme?.name ?? (slug ? titleizeSlug(slug) : "Thèmes");
  const path = slug ? `/theme/${theme?.slug ?? slug}` : "/theme";

  return buildDefaultMetadata({
    canonicalPath: path,
    description:
      theme?.factsCount && theme.factsCount > 0
        ? `${themeName} sur Grumm : ${theme.factsCount} faits courts pour explorer ce sujet avec clarté.`
        : `${themeName} sur Grumm : une porte d’entrée claire pour explorer la culture par thèmes.`,
    title: slug ? `${themeName} : faits et repères culturels` : "Tous les thèmes culturels",
  });
}

export function buildArticleJsonLd(fact: SeoFact) {
  const category = firstCategory(fact.categories);
  const description = stripToDescription(
    fact.seo_description || fact.hook || fact.content || fact.long_content,
    220,
  );

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fact.seo_title || fact.title,
    description,
    datePublished: fact.published_at ?? undefined,
    dateModified: fact.updated_at ?? fact.published_at ?? undefined,
    articleSection: category?.name ?? undefined,
    author: {
      "@type": "Organization",
      name: siteConfig.name,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
    },
    mainEntityOfPage: buildCanonicalUrl(`/fait/${fact.slug}`),
  };
}

export function buildThemeJsonLd(theme: SeoTheme, facts: SeoFact[] = []) {
  const themeUrl = buildCanonicalUrl(`/theme/${theme.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: theme.name,
    url: themeUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: facts.slice(0, 12).map((fact, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: buildCanonicalUrl(`/fait/${fact.slug}`),
        name: fact.title,
      })),
    },
  };
}

export async function getThemeTitleBySlug(slug: string) {
  const theme = await getThemeBySlugForSeo(slug);

  return theme?.name ?? titleizeSlug(slug);
}

export async function getFactTitleBySlug(slug: string) {
  const fact = await getFactBySlugForSeo(slug);

  return fact?.title ?? titleizeSlug(slug);
}

export async function getFactMetadataBySlug(slug: string) {
  const fact = await getFactBySlugForSeo(slug);
  const category = firstCategory(fact?.categories ?? null);

  return {
    title: fact?.title ?? titleizeSlug(slug),
    description:
      stripToDescription(fact?.seo_description || fact?.hook || fact?.content) ||
      "Un fait court et mémorable à découvrir sur Grumm.",
    themeName: category?.name ?? null,
    themeSlug: category?.slug ?? null,
    canonicalPath: `/fait/${fact?.slug ?? slug}`,
  };
}

export async function getFactBySlugForSeo(slug: string) {
  const supabase = createSupabaseMetadataClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("facts")
    .select(PUBLISHED_FACT_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return (data as SeoFact | null) ?? null;
}

export async function getRelatedFactsForSeo(categoryId: string, excludeFactId?: string) {
  const supabase = createSupabaseMetadataClient();

  if (!supabase) {
    return [];
  }

  let query = supabase
    .from("facts")
    .select(PUBLISHED_FACT_SELECT)
    .eq("category_id", categoryId)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(6);

  if (excludeFactId) {
    query = query.neq("id", excludeFactId);
  }

  const { data } = await query;

  return ((data ?? []) as SeoFact[]).filter(Boolean);
}

export async function getPublicThemesForSeo() {
  const supabase = createSupabaseMetadataClient();

  if (!supabase) {
    return [] as SeoTheme[];
  }

  const { data } = await supabase
    .from("categories")
    .select("id,name,slug,tone,accent_color,updated_at")
    .order("name", { ascending: true });

  const themes = ((data ?? []) as SeoTheme[]).filter(
    (theme) => !isCommercialCollaborationSlug(theme.slug),
  );

  if (themes.length === 0) {
    return themes;
  }

  const counts = await Promise.all(
    themes.map(async (theme) => {
      const { count } = await supabase
        .from("facts")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .eq("category_id", theme.id);

      return [theme.id, count ?? 0] as const;
    }),
  );
  const countsByTheme = new Map(counts);

  return themes.map((theme) => ({
    ...theme,
    factsCount: countsByTheme.get(theme.id) ?? 0,
  }));
}

export async function getThemeBySlugForSeo(slug: string) {
  const themes = await getPublicThemesForSeo();

  return themes.find((theme) => theme.slug === slug) ?? null;
}

export async function getThemeFactsForSeo(slug: string, limit = 9) {
  const supabase = createSupabaseMetadataClient();
  const theme = await getThemeBySlugForSeo(slug);

  if (!supabase || !theme) {
    return { facts: [] as SeoFact[], theme };
  }

  const { data } = await supabase
    .from("facts")
    .select(PUBLISHED_FACT_SELECT)
    .eq("category_id", theme.id)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    facts: (data ?? []) as SeoFact[],
    theme,
  };
}

export async function getPublishedFactsForSitemap() {
  const supabase = createSupabaseMetadataClient();

  if (!supabase) {
    return [] as Pick<SeoFact, "slug" | "updated_at">[];
  }

  const { data } = await supabase
    .from("facts")
    .select("slug,updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false });

  return (data ?? []) as Pick<SeoFact, "slug" | "updated_at">[];
}

export async function getTodayFactsForSeo(date = new Date()) {
  const supabase = createSupabaseMetadataClient();

  if (!supabase) {
    return [] as SeoFact[];
  }

  const { data } = await supabase
    .from("facts")
    .select(PUBLISHED_FACT_SELECT)
    .eq("status", "published")
    .eq("event_month", date.getMonth() + 1)
    .eq("event_day", date.getDate())
    .order("event_year", { ascending: true, nullsFirst: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(12);

  if (data?.length) {
    return data as SeoFact[];
  }

  const fallback = await supabase
    .from("facts")
    .select(PUBLISHED_FACT_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(6);

  return (fallback.data ?? []) as SeoFact[];
}
