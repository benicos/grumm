"use client";

import { useParams } from "next/navigation";
import GradeEditor from "../GradeEditor";

export default function EditGradePage() {
  const params = useParams<{ id: string }>();

  return <GradeEditor gradeId={params.id} />;
}
