"use client";

import { useParams } from "next/navigation";
import ThemeEditor from "../ThemeEditor";

export default function EditThemePage() {
  const params = useParams<{ id: string }>();

  return <ThemeEditor themeId={params.id} />;
}
