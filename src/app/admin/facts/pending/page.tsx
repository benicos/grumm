import FactsList from "../FactsList";

export default function PendingFactsPage() {
  return (
    <FactsList
      eyebrow="Validation"
      title="Faits en attente"
      description="Consulter, corriger, valider ou rejeter les faits proposes par les redacteurs."
      initialStatusFilter="pending_review"
    />
  );
}
