import type { Metadata } from "next";
import { AppState } from "./components/AppState";

export const metadata: Metadata = {
  title: "Accès refusé",
};

export default function Forbidden() {
  return (
    <AppState
      eyebrow="403"
      title="Acces protege."
      description="Cette ressource demande une connexion ou des droits supplementaires. Aucun contenu brut n'est affiche."
      primaryHref="/login"
      primaryLabel="Se connecter"
      secondaryHref="/discover"
      secondaryLabel="Retour à Découvrir"
    />
  );
}
