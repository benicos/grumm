import FactsManager from "../FactsManager";

export default function PendingFactsPage() {
  return (
    <FactsManager
      eyebrow="Validation"
      title="Faits en attente"
      description="Consulter, corriger, valider ou rejeter les faits proposes par les redacteurs."
      initialStatusFilter="pending_review"
    />
  );
}
