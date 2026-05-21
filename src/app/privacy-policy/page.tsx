import type { Metadata } from "next";
import InfoPageShell from "../components/InfoPageShell";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

export default function PrivacyPage() {
  return (
    <InfoPageShell
      eyebrow="Confidentialité"
      title="Des données limitées à l&apos;expérience Velora."
      intro="Cette page résume les informations utilisées pour faire fonctionner le compte, les sauvegardes et la progression."
    >
      <section>
        <h2 className="text-xl font-extrabold text-white">Données de compte</h2>
        <p className="mt-3">
          Velora peut traiter ton email, ton pseudo, ton objectif quotidien et les éléments nécessaires à la connexion. Ces informations servent à retrouver ton espace et synchroniser ton activité.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-extrabold text-white">Activité dans l&apos;application</h2>
        <p className="mt-3">
          Les faits lus, aimés, enregistrés et les objectifs quotidiens peuvent être conservés afin d&apos;afficher ta progression, tes grades et ta bibliothèque personnelle.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-extrabold text-white">Partage et sources</h2>
        <p className="mt-3">
          Lorsque tu partages un fait, le contenu partagé peut inclure son titre, son contexte court et son lien public. Les sources externes s&apos;ouvrent hors de Velora.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-extrabold text-white">Tes droits</h2>
        <p className="mt-3">
          Tu peux demander l&apos;accès, la correction ou la suppression de tes données depuis la page Contact. Les messages restent volontairement simples et ne nécessitent aucune information technique.
        </p>
      </section>
    </InfoPageShell>
  );
}
