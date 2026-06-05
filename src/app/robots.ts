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
        "/admin/*",
        "/forgot-password",
        "/login",
        "/login/",
        "/profile",
        "/profile/",
        "/profile/*",
        "/profil",
        "/profil/",
        "/profil/*",
        "/quiz/memoire",
        "/quiz/memoire/",
        "/quiz/memoire/*",
        "/register",
        "/register/",
        "/reset-password",
        "/reset-password/",
      ],
    },
    sitemap: buildCanonicalUrl("/sitemap.xml"),
    host: getSiteUrl(),
  };
}
