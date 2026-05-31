import type { MetadataRoute } from "next";
import { buildCanonicalUrl, getSiteUrl } from "@/lib/serverMetadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/login", "/profile", "/profil"],
    },
    sitemap: buildCanonicalUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
