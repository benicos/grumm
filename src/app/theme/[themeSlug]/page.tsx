"use client";

import { useParams } from "next/navigation";
import { isCommercialCollaborationSlug } from "@/lib/commercial";
import FactFeed from "../../discover/FactFeed";
import { AppState } from "../../components/AppState";

export default function ThemePage() {
  const params = useParams<{ themeSlug: string }>();
  const isCommercialTheme = isCommercialCollaborationSlug(params.themeSlug);

  if (isCommercialTheme) {
    return (
      <AppState
        eyebrow="Thème"
        title="Ce thème n'est pas accessible."
        description="Les collaborations commerciales ne sont pas affichées comme des thèmes éditoriaux."
        primaryHref="/explorer"
        primaryLabel="Retour à Explorer"
        secondaryHref="/discover"
        secondaryLabel="Ouvrir le flux"
      />
    );
  }

  return <FactFeed themeSlug={params.themeSlug} />;
}
