import type { Metadata } from "next";
import { AppState } from "./components/AppState";

export const metadata: Metadata = {
  title: "Accès refusé",
};

export default function Forbidden() {
  return (
    <AppState
      eyebrow="403"
      title="Accès protégé."
      description="Cette ressource demande une connexion ou des droits supplémentaires. Aucun contenu brut n’est affiché."
      primaryHref="/login"
      primaryLabel="Se connecter"
      secondaryHref="/discover"
      secondaryLabel="Retour à Découvrir"
    />
  );
}
