import GradeEditor from "../../GradeEditor";

export default async function EditGradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <GradeEditor gradeId={id} />;
}
