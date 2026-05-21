"use client";

import { useEffect } from "react";
import { logAppError } from "@/lib/errors";
import { AppState } from "./components/AppState";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    logAppError(error, {
      operation: "render app error boundary",
      route: window.location.pathname,
    });
  }, [error]);

  return (
    <div className="bg-[#132338]">
      <title>Erreur | Grumm.</title>
      <AppState
        eyebrow="Erreur"
        title="Grumm. a perdu le fil."
        description="Une erreur inattendue est survenue. Tu peux relancer la page ou revenir à Découvrir."
        primaryHref="/discover"
        primaryLabel="Retour à Découvrir"
        secondaryHref="/"
        secondaryLabel="Accueil"
      />
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[14px] border border-white/10 bg-white/[0.08] px-5 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:border-white/20"
      >
        Reessayer
      </button>
    </div>
  );
}
