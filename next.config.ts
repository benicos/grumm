import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/about",
        destination: "/a-propos",
        permanent: true,
      },
      {
        source: "/privacy-policy",
        destination: "/politique-confidentialite",
        permanent: true,
      },
      {
        source: "/memory-challenge",
        destination: "/quiz/memoire",
        permanent: true,
      },
      {
        source: "/defi-memoire",
        destination: "/quiz/memoire",
        permanent: true,
      },
      {
        source: "/profile/memory-challenge",
        destination: "/quiz/memoire",
        permanent: true,
      },
      {
        source: "/profil/memory-challenge",
        destination: "/quiz/memoire",
        permanent: true,
      },
      {
        source: "/profil/defi-memoire",
        destination: "/quiz/memoire",
        permanent: true,
      },
      {
        source: "/quizz",
        destination: "/quiz",
        permanent: true,
      },
      {
        source: "/discover/theme/:themeSlug",
        destination: "/decouvrir/theme/:themeSlug",
        permanent: true,
      },
      {
        source: "/admin/categories/:id/edit",
        destination: "/admin/themes/:id/edit",
        permanent: true,
      },
      {
        source: "/admin/categories/:id",
        destination: "/admin/themes/:id",
        permanent: true,
      },
      {
        source: "/admin/categories",
        destination: "/admin/themes",
        permanent: true,
      },
      {
        source: "/explorer",
        destination: "/theme",
        permanent: true,
      },
      {
        source: "/explore",
        destination: "/theme",
        permanent: true,
      },
      {
        source: "/today",
        destination: "/aujourdhui",
        permanent: true,
      },
      {
        source: "/discover",
        destination: "/decouvrir",
        permanent: true,
      },
      {
        source: "/fact/:factSlug",
        destination: "/fait/:factSlug",
        permanent: true,
      },
      {
        source: "/profile/:path*",
        destination: "/profil/:path*",
        permanent: true,
      },
      {
        source: "/profile",
        destination: "/profil",
        permanent: true,
      },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
