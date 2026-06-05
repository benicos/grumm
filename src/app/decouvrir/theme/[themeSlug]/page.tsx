"use client";

import { useParams } from "next/navigation";
import {
  canAccessCommercialCollaboration,
  isCommercialCollaborationSlug,
} from "@/lib/commercial";
import { useAuth } from "@/app/auth/AuthProvider";
import { AppState } from "@/app/components/AppState";
import FactFeed from "@/app/discover/FactFeed";

export default function DecouvrirThemePage() {
  const params = useParams<{ themeSlug: string }>();
  const { isLoading, profile } = useAuth();
  const isCommercialTheme = isCommercialCollaborationSlug(params.themeSlug);

  if (isCommercialTheme && isLoading) {
    return (
      <AppState
        eyebrow="Acces reserve"
        title="Verification des droits..."
        description="Ce flux est reserve aux profils editoriaux."
        primaryHref="/decouvrir"
        primaryLabel="Retour a Decouvrir"
      />
    );
  }

  if (
    isCommercialTheme &&
    !canAccessCommercialCollaboration(profile?.role ?? null)
  ) {
    return (
      <AppState
        eyebrow="Acces reserve"
        title="Ce theme n'est pas accessible."
        description="Les collaborations commerciales sont gerees dans les espaces editoriaux de Grumm."
        primaryHref="/decouvrir"
        primaryLabel="Retour a Decouvrir"
        secondaryHref="/theme"
        secondaryLabel="Explorer"
      />
    );
  }

  return <FactFeed themeSlug={params.themeSlug} />;
}
