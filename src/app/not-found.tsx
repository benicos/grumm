import type { Metadata } from "next";
import { AppState } from "./components/AppState";

export const metadata: Metadata = {
  title: "Page introuvable",
};

export default function NotFound() {
  return (
    <AppState
      eyebrow="404"
      title="Cette page n'existe pas."
      description="Oups, le lien est peut-être ancien ou le contenu a été déplacé."
      primaryHref="/"
      primaryLabel="Retour accueil"
      secondaryHref="/discover"
      secondaryLabel="Ouvrir Découvrir"
    />
  );
}
