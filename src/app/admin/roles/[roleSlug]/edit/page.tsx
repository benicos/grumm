import RoleEditor from "../../RoleEditor";

export default async function EditRolePage({
  params,
}: {
  params: Promise<{ roleSlug: string }>;
}) {
  const { roleSlug } = await params;

  return <RoleEditor roleSlug={roleSlug} />;
}
