import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import InfoPageShell from "../components/InfoPageShell";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/a-propos",
  description:
    "À propos de Grumm, une expérience culturelle courte, dense et mémorable.",
  title: "À propos",
});

export default function AboutPage() {
  return (
    <InfoPageShell
      eyebrow="À propos"
      title="Une curiosité courte, dense et mémorable."
      intro="Grumm transforme la découverte de faits en une expérience verticale, immersive et facile à reprendre chaque jour."
    >
      <section>
        <h2 className="text-xl font-extrabold text-white">Notre intention</h2>
        <p className="mt-3">
          L&apos;application met en avant des faits courts, éducatifs et captivants, avec une lecture pensée pour les moments rapides sans sacrifier la qualité du contexte.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-extrabold text-white">L&apos;expérience</h2>
        <p className="mt-3">
          Chaque fait associe un titre fort, un contexte lisible et une source. L&apos;objectif est de donner envie de comprendre, enregistrer et partager sans transformer la découverte en flux bruyant.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-extrabold text-white">Progression</h2>
        <p className="mt-3">
          Les objectifs quotidiens et les grades servent à matérialiser une habitude de curiosité, avec une célébration légère quand le rythme est tenu.
        </p>
      </section>
    </InfoPageShell>
  );
}
