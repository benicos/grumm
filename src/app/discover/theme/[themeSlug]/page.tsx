"use client";

import { useParams } from "next/navigation";
import {
  canAccessCommercialCollaboration,
  isCommercialCollaborationSlug,
} from "@/lib/commercial";
import { useAuth } from "../../../auth/AuthProvider";
import { AppState } from "../../../components/AppState";
import FactFeed from "../../FactFeed";

export default function DiscoverThemePage() {
  const params = useParams<{ themeSlug: string }>();
  const { isLoading, profile } = useAuth();
  const isCommercialTheme = isCommercialCollaborationSlug(params.themeSlug);

  if (isCommercialTheme && isLoading) {
    return (
      <AppState
        eyebrow="Acces reserve"
        title="Verification des droits..."
        description="Ce flux est reserve aux profils editoriaux."
        primaryHref="/discover"
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
        primaryHref="/discover"
        primaryLabel="Retour a Decouvrir"
        secondaryHref="/explorer"
        secondaryLabel="Explorer"
      />
    );
  }

  return <FactFeed themeSlug={params.themeSlug} />;
}
