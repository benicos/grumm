import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import {
  buildDefaultMetadata,
  buildThemeJsonLd,
  getTodayFactsForSeo,
} from "@/lib/serverMetadata";
import Footer from "../components/Footer";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import { premiumPrimaryCtaClassName } from "../components/buttonStyles";

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
      <main className="relative z-10 mx-auto min-h-[calc(100vh-92px)] w-full max-w-[1120px] px-5 py-12 sm:px-6 lg:px-8">
        <PageHero
          Icon={CalendarDays}
          eyebrow={todayLabel}
          title="Aujourd’hui dans la culture."
          description="Événements, anniversaires et faits liés à la date du jour pour entrer dans la culture par le calendrier."
        />

        <div className="mx-auto flex justify-center">
          <Link href="/decouvrir" className={`${premiumPrimaryCtaClassName} inline-flex`}>
            Découvrir le flux
          </Link>
        </div>

        <section className="mx-auto mt-10 grid w-full max-w-5xl gap-4 md:grid-cols-2 lg:grid-cols-3">
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
