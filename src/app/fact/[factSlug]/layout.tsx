import type { Metadata } from "next";
import { siteConfig } from "@/config/app";
import { absoluteUrl, getFactMetadataBySlug } from "@/lib/serverMetadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ factSlug: string }>;
}): Promise<Metadata> {
  const { factSlug } = await params;
  const fact = await getFactMetadataBySlug(factSlug);
  const canonicalUrl = absoluteUrl(fact.canonicalPath);
  const imageUrl = absoluteUrl(`${fact.canonicalPath}/opengraph-image`);

  return {
    title: fact.title,
    description: fact.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${fact.title} | ${siteConfig.name}`,
      description: fact.description,
      url: canonicalUrl,
      siteName: siteConfig.name,
      type: "article",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${fact.title} - ${siteConfig.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${fact.title} | ${siteConfig.name}`,
      description: fact.description,
      images: [imageUrl],
    },
  };
}

export default function FactDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
