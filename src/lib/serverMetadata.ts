import { createClient } from "@supabase/supabase-js";
import { siteConfig } from "@/config/app";
import type { Database } from "@/types/database";

function createSupabaseMetadataClient() {
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

function stripToDescription(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 156);
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

export function absoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

export function titleizeSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getThemeTitleBySlug(slug: string) {
  const supabase = createSupabaseMetadataClient();

  if (!supabase) {
    return titleizeSlug(slug);
  }

  const { data } = await supabase
    .from("categories")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  return data?.name ?? titleizeSlug(slug);
}

export async function getFactTitleBySlug(slug: string) {
  const supabase = createSupabaseMetadataClient();

  if (!supabase) {
    return titleizeSlug(slug);
  }

  const { data } = await supabase
    .from("facts")
    .select("title")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return data?.title ?? titleizeSlug(slug);
}

export async function getFactMetadataBySlug(slug: string) {
  const fallbackTitle = titleizeSlug(slug);
  const supabase = createSupabaseMetadataClient();

  if (!supabase) {
    return {
      title: fallbackTitle,
      description: "Un fait court et mémorable à découvrir sur Velora.",
      themeName: null,
      themeSlug: null,
      canonicalPath: `/fact/${slug}`,
    };
  }

  const { data } = await supabase
    .from("facts")
    .select("title,hook,content,slug,categories(name,slug)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  const category = Array.isArray(data?.categories)
    ? data?.categories[0]
    : data?.categories;

  return {
    title: data?.title ?? fallbackTitle,
    description: stripToDescription(
      data?.hook || data?.content || "Un fait court et mémorable à découvrir sur Velora.",
    ),
    themeName: category?.name ?? null,
    themeSlug: category?.slug ?? null,
    canonicalPath: `/fact/${data?.slug ?? slug}`,
  };
}
