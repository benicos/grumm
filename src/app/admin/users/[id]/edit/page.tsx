import UserEditor from "../../UserEditor";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <UserEditor userId={id} />;
}
