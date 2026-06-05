import FactEditor from "../../FactEditor";

export default async function EditFactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <FactEditor factId={id} />;
}
