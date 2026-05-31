import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/discover/theme/:themeSlug",
        destination: "/decouvrir?theme=:themeSlug",
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
