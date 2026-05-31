import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buildThemeJsonLd,
  buildThemeMetadata,
  getThemeFactsForSeo,
  type SeoFact,
} from "@/lib/serverMetadata";
import Footer from "../../components/Footer";
import HeroBackground from "../../components/HeroBackground";
import Navbar from "../../components/Navbar";
import {
  premiumPrimaryCtaClassName,
  premiumTitleGradientClassName,
} from "../../components/buttonStyles";

type ThemePageProps = {
  params: Promise<{ themeSlug: string }>;
};

export async function generateMetadata({
  params,
}: ThemePageProps): Promise<Metadata> {
  const { themeSlug } = await params;
  const { theme } = await getThemeFactsForSeo(themeSlug, 1);

  return buildThemeMetadata(theme, themeSlug);
}

function FactLink({ fact }: { fact: SeoFact }) {
  return (
    <Link
      href={`/fait/${fact.slug}`}
      className="group rounded-[24px] border border-white/10 bg-white/[0.045] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffe4a1]/75">
        Fait
      </p>
      <h2 className="mt-4 text-xl font-bold leading-tight tracking-[-0.03em] text-white">
        {fact.title}
      </h2>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/62">
        {fact.hook || fact.content}
      </p>
    </Link>
  );
}

export default async function ThemeLandingPage({ params }: ThemePageProps) {
  const { themeSlug } = await params;
  const { facts, theme } = await getThemeFactsForSeo(themeSlug, 9);

  if (!theme) {
    notFound();
  }

  const jsonLd = buildThemeJsonLd(theme, facts);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07111f] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroBackground />
      <Navbar />
      <main className="relative z-10 mx-auto max-w-[1180px] px-5 pb-24 pt-16 lg:px-8">
        <section className={`rounded-[34px] border border-white/10 bg-gradient-to-br ${theme.tone ?? "from-[#111827] via-[#1f2937] to-[#334155]"} p-8 shadow-[0_32px_100px_rgba(0,0,0,0.34)] sm:p-12`}>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/58">
            Thème culturel
          </p>
          <h1 className={`${premiumTitleGradientClassName} mt-5 max-w-3xl text-[clamp(3rem,7vw,6rem)] font-extrabold leading-[0.95]`}>
            {theme.name}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72">
            Une sélection de faits pour entrer dans ce sujet par petites
            touches, avec des repères clairs et des liens vers les contenus
            les plus récents.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/decouvrir?theme=${theme.slug}`}
              className={premiumPrimaryCtaClassName}
            >
              Explorer ce thème
            </Link>
            <Link
              href="/theme"
              className="rounded-full border border-white/12 px-5 py-3 text-sm font-bold text-white/72 transition hover:border-white/24 hover:text-white"
            >
              Tous les thèmes
            </Link>
          </div>
        </section>

        <section className="mt-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ffe4a1]/70">
                À lire
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                Faits récents
              </h2>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {facts.map((fact) => (
              <FactLink key={fact.id} fact={fact} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
