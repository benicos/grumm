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
      description="Le lien est peut-etre ancien ou le contenu a ete deplace. Découvrir reste disponible."
      primaryHref="/"
      primaryLabel="Retour accueil"
      secondaryHref="/discover"
      secondaryLabel="Ouvrir Découvrir"
    />
  );
}
