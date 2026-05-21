import { redirect } from "next/navigation";

export default async function LegacyThemeFactsPage({
  params,
}: {
  params: Promise<{ themeSlug: string }>;
}) {
  const { themeSlug } = await params;

  redirect(`/discover/theme/${themeSlug}`);
}
