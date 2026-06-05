import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buildThemeJsonLd,
  buildThemeMetadata,
  getThemeFactsForSeo,
  type SeoFact,
} from "@/lib/serverMetadata";
import {
  getThemeAccent,
  getThemeGradientStops,
  getThemeLongDescription,
  getThemeShortDescription,
} from "@/lib/themeDisplay";
import Footer from "../../components/Footer";
import HeroBackground from "../../components/HeroBackground";
import Navbar from "../../components/Navbar";
import ThemeIcon from "../../components/ThemeIcon";
import ThemeMotif from "../../components/ThemeMotif";
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
  const { facts, theme } = await getThemeFactsForSeo(themeSlug, 24);

  if (!theme) {
    notFound();
  }

  const jsonLd = buildThemeJsonLd(theme, facts);
  const firstReads = facts.slice(0, 3);
  const popularFacts = [...facts]
    .sort((a, b) => (b.hook?.length ?? 0) - (a.hook?.length ?? 0))
    .slice(0, 3);
  const recentFacts = facts.slice(0, 12);
  const accent = getThemeAccent(theme);
  const gradient = getThemeGradientStops(theme);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#07111f] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HeroBackground />
      <Navbar />
      <main className="relative z-10 mx-auto max-w-[1180px] px-5 pb-24 pt-16 lg:px-8">
        <section
          className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#0a1728]/88 p-8 shadow-[0_32px_100px_rgba(0,0,0,0.34)] sm:p-12"
          style={{
            backgroundImage: `radial-gradient(circle at 82% 18%, ${accent}24, transparent 30%), radial-gradient(circle at 12% 96%, ${gradient.middle}18, transparent 38%), linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.018))`,
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              backgroundImage: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            }}
          />
          <ThemeMotif
            motif={theme.visual_motif}
            className="absolute right-8 top-8 h-24 w-24 opacity-40 sm:h-36 sm:w-36"
            style={{ color: accent }}
          />
          <p className="relative text-sm font-bold uppercase tracking-[0.18em] text-white/58">
            Thème culturel
          </p>
          <div
            className="relative mt-6 grid h-16 w-16 place-items-center rounded-2xl border border-white/14 bg-black/22 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur"
            style={{ color: accent }}
          >
            <ThemeIcon iconName={theme.theme_icon} className="h-8 w-8" />
          </div>
          <h1
            className={`${premiumTitleGradientClassName} relative mt-5 max-w-3xl text-[clamp(2.5rem,5.8vw,4.8rem)] font-extrabold leading-[0.98]`}
          >
            {theme.name}
          </h1>
          <p className="relative mt-6 max-w-2xl text-lg leading-8 text-white/76">
            {getThemeLongDescription(theme)}
          </p>
          <div className="relative mt-7 flex flex-wrap gap-2">
            {(theme.keywords ?? []).slice(0, 5).map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-white/12 bg-black/16 px-3 py-1 text-xs font-bold text-white/68"
                style={{ boxShadow: `inset 0 0 0 1px ${accent}18` }}
              >
                {keyword}
              </span>
            ))}
          </div>
          <div className="relative mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/decouvrir?theme=${theme.slug}`}
              className={`${premiumPrimaryCtaClassName} ring-1 ring-white/20`}
              style={{
                boxShadow: `0 22px 70px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.55)`,
              }}
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

        {firstReads.length > 0 ? (
          <section className="mt-14">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ffe4a1]/70">
              À lire en premier
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Les portes d’entrée
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {firstReads.map((fact) => (
                <FactLink key={fact.id} fact={fact} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-14 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
              Repères essentiels
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Ce que ce thème permet de comprendre
            </h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {(theme.keywords?.length
                ? theme.keywords
                : [getThemeShortDescription(theme)]
              ).map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-white/[0.07] px-4 py-2 text-sm font-bold text-white/70"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/18 p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
              Les plus structurants
            </p>
            <div className="mt-5 divide-y divide-white/10">
              {popularFacts.map((fact) => (
                <Link
                  key={fact.id}
                  href={`/fait/${fact.slug}`}
                  className="block py-4 transition hover:translate-x-1 hover:text-[#ffe4a1]"
                >
                  <p className="font-extrabold tracking-[-0.03em]">
                    {fact.title}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/54">
                    {fact.hook || fact.content}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {recentFacts.length > 0 ? (
          <section className="mt-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#ffe4a1]/70">
                  Bibliothèque
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Tous les faits du thème
                </h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentFacts.map((fact) => (
                <FactLink key={fact.id} fact={fact} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
