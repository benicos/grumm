"use client";

import { useParams } from "next/navigation";
import FactEditor from "../../FactEditor";

export default function EditFactPage() {
  const params = useParams<{ id: string }>();

  return <FactEditor factId={params.id} />;
}
