import ThemeEditor from "../../ThemeEditor";

export default async function EditThemePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ThemeEditor themeId={id} />;
}
