import type { Metadata } from "next";
import Link from "next/link";
import {
  buildDefaultMetadata,
  buildThemeJsonLd,
  getTodayFactsForSeo,
} from "@/lib/serverMetadata";
import Footer from "../components/Footer";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";
import {
  premiumPrimaryCtaClassName,
  premiumTitleGradientClassName,
} from "../components/buttonStyles";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/aujourdhui",
  imagePath: "/aujourdhui/opengraph-image",
  description:
    "Les faits culturels à découvrir aujourd’hui sur Grumm, liés à la date du jour ou sélectionnés pour nourrir la curiosité.",
  title: "Aujourd’hui",
});

export default async function TodayPage() {
  const facts = await getTodayFactsForSeo();
  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  }).format(new Date());
  const jsonLd = buildThemeJsonLd(
    {
      accent_color: "#ffd166",
      factsCount: facts.length,
      id: "today",
      name: `Aujourd’hui, ${todayLabel}`,
      slug: "aujourdhui",
      tone: "from-[#101827] via-[#1f2937] to-[#3b465b]",
      updated_at: new Date().toISOString(),
    },
    facts,
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07111f] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroBackground />
      <Navbar />
      <main className="relative z-10 mx-auto max-w-[1180px] px-5 pb-24 pt-16 lg:px-8">
        <section className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ffe4a1]/80">
            {todayLabel}
          </p>
          <h1 className={`${premiumTitleGradientClassName} mt-5 text-[clamp(3rem,7vw,5.8rem)] font-extrabold leading-[0.95]`}>
            Aujourd’hui dans la culture.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
            Une sélection liée à la date du jour quand elle existe, complétée
            par des faits récents pour garder une porte ouverte vers la
            découverte.
          </p>
          <Link href="/decouvrir" className={`${premiumPrimaryCtaClassName} mt-8 inline-flex`}>
            Découvrir le flux
          </Link>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {facts.map((fact) => (
            <Link
              key={fact.id}
              href={`/fait/${fact.slug}`}
              className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.075]"
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffe4a1]/70">
                {fact.event_day && fact.event_month
                  ? `${fact.event_day}/${fact.event_month}`
                  : "Sélection"}
              </p>
              <h2 className="mt-4 text-xl font-bold leading-tight tracking-[-0.03em]">
                {fact.title}
              </h2>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/62">
                {fact.hook || fact.content}
              </p>
            </Link>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}
