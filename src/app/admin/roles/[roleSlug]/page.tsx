"use client";

import { useParams } from "next/navigation";
import RoleEditor from "../RoleEditor";

export default function EditRolePage() {
  const params = useParams<{ roleSlug: string }>();

  return <RoleEditor roleSlug={params.roleSlug} />;
}
