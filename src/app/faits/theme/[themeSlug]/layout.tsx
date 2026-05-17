import type { Metadata } from "next";
import { getThemeTitleBySlug } from "@/lib/serverMetadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ themeSlug: string }>;
}): Promise<Metadata> {
  const { themeSlug } = await params;

  return {
    title: await getThemeTitleBySlug(themeSlug),
  };
}

export default function ThemeFactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
