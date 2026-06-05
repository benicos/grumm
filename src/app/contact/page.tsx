import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import InfoPageShell from "../components/InfoPageShell";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/contact",
  imagePath: "/contact/opengraph-image",
  description:
    "Contacte Grumm pour une question, une correction éditoriale ou une demande liée au compte.",
  title: "Contact",
});

export default function ContactPage() {
  return (
    <InfoPageShell
      eyebrow="Contact"
      title="Une question, une idée, une correction."
      intro="Grumm est conçu pour rester clair et fiable. Les retours éditoriaux, techniques ou produit sont les bienvenus."
    >
      <section>
        <h2 className="text-xl font-extrabold text-white">Nous écrire</h2>
        <p className="mt-3">
          Pour une question générale ou une demande liée à ton compte, écris à{" "}
          <a
            href="mailto:contact@grumm.fr"
            className="font-bold text-[#ffd166] underline decoration-white/0 underline-offset-4 transition hover:decoration-[#ffd166]/70"
          >
            contact@grumm.fr
          </a>
          .
        </p>
      </section>
      <section>
        <h2 className="text-xl font-extrabold text-white">Signaler une source</h2>
        <p className="mt-3">
          Si une source semble incomplète ou si un fait mérite une correction, indique le titre du fait et le lien concerné pour faciliter la vérification.
        </p>
      </section>
      <section>
        <h2 className="text-xl font-extrabold text-white">Données personnelles</h2>
        <p className="mt-3">
          Pour toute demande concernant tes données, précise l&apos;email associé au compte afin que nous puissions traiter la demande correctement.
        </p>
      </section>
    </InfoPageShell>
  );
}
