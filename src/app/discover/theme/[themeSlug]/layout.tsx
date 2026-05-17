import type { Metadata } from "next";
import { getThemeTitleBySlug } from "@/lib/serverMetadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ themeSlug: string }>;
}): Promise<Metadata> {
  const { themeSlug } = await params;
  const title = await getThemeTitleBySlug(themeSlug);

  return {
    title,
    description: `Découvrir les faits Velora liés au thème ${title}.`,
  };
}

export default function DiscoverThemeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
