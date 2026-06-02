import type { MetadataRoute } from "next";
import { buildCanonicalUrl, getSiteUrl } from "@/lib/serverMetadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/forgot-password",
        "/login",
        "/profile",
        "/profil",
        "/register",
        "/reset-password",
      ],
    },
    sitemap: buildCanonicalUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
