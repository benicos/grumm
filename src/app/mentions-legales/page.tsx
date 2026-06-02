import type { Metadata } from "next";
import Link from "next/link";
import { appRoutes, siteConfig } from "@/config/app";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import InfoPageShell from "../components/InfoPageShell";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/mentions-legales",
  description:
    "Mentions légales de Grumm : éditeur, contact, hébergement, propriété intellectuelle et responsabilité éditoriale.",
  title: "Mentions légales",
});

const sections = [
  {
    title: "Site",
    body: [
      `Nom du site : ${siteConfig.officialName}.`,
      `Adresse principale : ${siteConfig.fallbackUrl}.`,
    ],
  },
  {
    title: "Éditeur",
    body: [
      "Éditeur du site : GRUMM.FR.",
      "Adresse : A VENIR.",
      "Email de contact : contact@grumm.fr.",
    ],
  },
  {
    title: "Hébergement",
    body: [
      "Hébergeur du site web : LWS.",
      "La base de données, l'authentification et certains services techniques peuvent être opérés via Supabase.",
      "Le déploiement du site peut être opéré via Vercel si cette configuration est confirmée.",
    ],
  },
  {
    title: "Propriété intellectuelle",
    body: [
      "Les textes, interfaces, éléments graphiques, bases de contenus, marques, noms et signes distinctifs présents sur Grumm sont protégés par le droit de la propriété intellectuelle, sauf mention contraire.",
      "Toute reproduction ou réutilisation non autorisée d'un élément du site est interdite, hors usages personnels, citations courtes et exceptions prévues par la loi.",
    ],
  },
  {
    title: "Responsabilité éditoriale",
    body: [
      "Grumm propose des faits courts et contextualisés à vocation culturelle. Les contenus sont vérifiés autant que possible, mais une erreur, une imprécision ou une source obsolète peut subsister.",
      "Les contenus ne constituent pas un conseil juridique, médical, financier ou professionnel.",
    ],
  },
  {
    title: "Signaler une erreur",
    body: [
      "Pour signaler une erreur, une source problématique ou une demande liée à un contenu, écrivez à contact@grumm.fr ou utilisez la page Contact.",
    ],
  },
  {
    title: "Données personnelles",
    body: [
      "Les informations relatives aux données personnelles, aux analytics et aux droits RGPD sont détaillées dans la politique de confidentialité.",
    ],
  },
];

export default function LegalNoticePage() {
  return (
    <InfoPageShell
      eyebrow="Mentions légales"
      title="Les informations légales de Grumm."
      intro="Cette page rassemble les informations minimales relatives à l'éditeur, à l'hébergement, aux contenus et aux moyens de contact."
    >
      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-extrabold text-white">
              {section.title}
            </h2>
            <div className="mt-3 space-y-3">
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        <Link
          href={appRoutes.privacy}
          className="inline-flex rounded-[14px] border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white/72 transition hover:border-white/20 hover:text-white"
        >
          Lire la politique de confidentialité
        </Link>
      </div>
    </InfoPageShell>
  );
}
