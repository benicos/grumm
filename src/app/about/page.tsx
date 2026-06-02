import type { Metadata } from "next";
import Link from "next/link";
import { appRoutes } from "@/config/app";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import { premiumPrimaryCtaClassName } from "../components/buttonStyles";
import InfoPageShell from "../components/InfoPageShell";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/a-propos",
  description:
    "À propos de Grumm, la plateforme qui permet d'apprendre un fait à la fois, de retenir davantage et de nourrir sa culture générale.",
  title: "À propos",
});

const sections = [
  {
    title: "Grumm, la culture qui se scrolle",
    body:
      "Grumm est né d'une idée simple : on peut apprendre beaucoup sans forcément passer des heures devant un livre, un documentaire ou un cours. Chaque fait est court, vérifié autant que possible, contextualisé et pensé pour rester en mémoire.",
  },
  {
    title: "Découvrir, retenir, revenir",
    body:
      "Sur Grumm, tu peux découvrir des faits, les enregistrer, tester ta mémoire, suivre ta progression et construire peu à peu ta propre bibliothèque culturelle.",
  },
  {
    title: "Une culture accessible",
    body:
      "Histoire, science, cinéma, musique, art, géographie, psychologie, nature ou philosophie : Grumm rassemble des repères utiles, étonnants ou essentiels, dans un format simple à lire.",
  },
  {
    title: "Une communauté de curieux",
    body:
      "Grumm s'adresse à celles et ceux qui aiment apprendre, comprendre, raconter et redécouvrir ce qu'ils pensaient déjà savoir.",
  },
];

export default function AboutPage() {
  return (
    <InfoPageShell
      eyebrow="À propos"
      title="Grumm, la culture qui se scrolle."
      intro="Une manière simple de nourrir sa culture générale, un fait à la fois, sans transformer la découverte en bruit permanent."
    >
      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-extrabold text-white">
              {section.title}
            </h2>
            <p className="mt-3">{section.body}</p>
          </section>
        ))}
      </div>

      <div className="pt-2">
        <Link href={appRoutes.discover} className={premiumPrimaryCtaClassName}>
          Découvrir un fait
        </Link>
      </div>
    </InfoPageShell>
  );
}
