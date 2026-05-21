import { redirect } from "next/navigation";

export default async function LegacyFactPage({
  params,
}: {
  params: Promise<{ factSlug: string }>;
}) {
  const { factSlug } = await params;

  redirect(`/fact/${factSlug}`);
}
