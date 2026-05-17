import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/faits",
        destination: "/discover",
        permanent: false,
      },
      {
        source: "/faits/theme/:themeSlug",
        destination: "/discover/theme/:themeSlug",
        permanent: false,
      },
      {
        source: "/fait/:factSlug",
        destination: "/fact/:factSlug",
        permanent: false,
      },
      {
        source: "/profil",
        destination: "/profile",
        permanent: false,
      },
      {
        source: "/connexion",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/inscription",
        destination: "/register",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
