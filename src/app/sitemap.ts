import type { MetadataRoute } from "next";
import {
  buildCanonicalUrl,
  getPublishedFactsForSitemap,
  getPublicThemesForSeo,
} from "@/lib/serverMetadata";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [facts, themes] = await Promise.all([
    getPublishedFactsForSitemap(),
    getPublicThemesForSeo(),
  ]);
  const now = new Date();
  const staticRoutes = [
    "/",
    "/a-propos",
    "/decouvrir",
    "/theme",
    "/quiz",
    "/quiz/general",
    "/aujourdhui",
    "/contact",
    "/politique-confidentialite",
    "/mentions-legales",
  ];

  return [
    ...staticRoutes.map((path) => ({
      url: buildCanonicalUrl(path),
      lastModified: now,
    })),
    ...themes.filter((theme) => theme.slug).map((theme) => ({
      url: buildCanonicalUrl(`/theme/${theme.slug}`),
      lastModified: theme.updated_at ? new Date(theme.updated_at) : now,
    })),
    ...facts.filter((fact) => fact.slug).map((fact) => ({
      url: buildCanonicalUrl(`/fait/${fact.slug}`),
      lastModified: fact.updated_at ? new Date(fact.updated_at) : now,
    })),
  ];
}
