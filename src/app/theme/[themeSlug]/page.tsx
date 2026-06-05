import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  Brain,
  ChevronRight,
  Compass,
  Library,
  Play,
  Sparkles,
  Tags,
} from "lucide-react";
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

function FactLink({ accent, fact }: { accent: string; fact: SeoFact }) {
  return (
    <Link
      href={`/fait/${fact.slug}`}
      className="group rounded-[24px] border border-white/10 bg-white/[0.045] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.07]"
      style={{
        backgroundImage: `radial-gradient(circle at 88% 10%, ${accent}12, transparent 32%)`,
      }}
    >
      <p
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]"
        style={{ color: accent }}
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
        Fait
      </p>
      <h2 className="mt-4 text-xl font-bold leading-tight tracking-[-0.03em] text-white">
        {fact.title}
      </h2>
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/62">
        {fact.hook || fact.content}
      </p>
      <span
        className="mt-5 inline-flex items-center text-xs font-black uppercase tracking-[0.14em] transition group-hover:translate-x-0.5"
        style={{ color: accent }}
      >
        Lire
        <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
      </span>
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
  const keywordAccents = [
    accent,
    gradient.middle,
    "#6ae3c0",
    "#a78bfa",
    "#ffb45f",
  ];
  const themeStats = [
    {
      accent,
      detail: `${facts.length} fait${facts.length > 1 ? "s" : ""} disponible${facts.length > 1 ? "s" : ""}`,
      href: `/decouvrir/theme/${theme.slug}`,
      icon: BookOpen,
      label: "Explorer",
      value: "Explorer",
    },
    {
      accent: "#a78bfa",
      detail: "Quiz disponibles",
      href: "/quiz",
      icon: Brain,
      label: "Tester",
      value: "Tester",
    },
  ];

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
          <div
            className="pointer-events-none absolute right-8 top-8 hidden h-36 w-36 place-items-center rounded-[30px] border border-white/12 bg-black/20 shadow-[0_28px_90px_rgba(0,0,0,0.26)] backdrop-blur lg:grid"
            style={{
              boxShadow: `0 28px 90px rgba(0,0,0,0.26), 0 0 70px ${accent}18`,
              color: accent,
            }}
          >
            <span className="absolute inset-2 rounded-[24px] border border-white/8 bg-white/[0.035]" />
            <ThemeIcon
              iconName={theme.theme_icon}
              className="relative h-16 w-16"
              strokeWidth={1.75}
            />
          </div>
          <p className="relative inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-white/58">
            <Tags
              className="h-4 w-4"
              style={{ color: accent }}
              aria-hidden="true"
            />
            Thème culturel
          </p>
          <h1
            className={`${premiumTitleGradientClassName} relative mt-5 max-w-3xl text-[clamp(2.5rem,5.8vw,4.8rem)] font-extrabold leading-[0.98]`}
          >
            {theme.name}
          </h1>
          <p className="relative mt-6 max-w-2xl text-lg leading-8 text-white/76">
            {getThemeLongDescription(theme)}
          </p>
          <div className="relative mt-7 flex flex-wrap gap-2">
            {(theme.keywords ?? []).slice(0, 5).map((keyword, index) => {
              const keywordAccent = keywordAccents[index % keywordAccents.length];

              return (
                <span
                  key={keyword}
                  className="rounded-full border px-3 py-1 text-xs font-bold text-white/72"
                  style={{
                    backgroundColor: `${keywordAccent}12`,
                    borderColor: `${keywordAccent}34`,
                    boxShadow: `inset 0 0 0 1px ${keywordAccent}12`,
                  }}
                >
                  {keyword}
                </span>
              );
            })}
          </div>
          <div className="relative mt-8 flex flex-wrap items-center gap-4">
            <Link
              href={`/decouvrir/theme/${theme.slug}`}
              className={`${premiumPrimaryCtaClassName} ring-1 ring-white/20`}
              style={{
                boxShadow: `0 22px 70px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.55)`,
              }}
            >
              <Play className="mr-2 h-4 w-4" aria-hidden="true" />
              Explorer ce thème
            </Link>
            <Link
              href="/theme"
              className="inline-flex items-center rounded-full border border-white/12 px-5 py-3 text-sm font-bold text-white/72 transition hover:border-white/24 hover:text-white"
            >
              <Compass className="mr-2 h-4 w-4" aria-hidden="true" />
              Tous les thèmes
            </Link>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          {themeStats.map(
            ({ accent: statAccent, detail, href, icon: Icon, label, value }) => {
            const content = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="grid h-11 w-11 place-items-center rounded-2xl border"
                    style={{
                      backgroundColor: `${statAccent}14`,
                      borderColor: `${statAccent}36`,
                      color: statAccent,
                    }}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span
                    className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]"
                    style={{
                      backgroundColor: `${statAccent}10`,
                      borderColor: `${statAccent}30`,
                      color: statAccent,
                    }}
                  >
                    {label}
                  </span>
                </div>
                <p className="mt-4 text-2xl font-black tracking-[-0.04em] text-white">
                  {value}
                </p>
                <p className="mt-1 text-sm font-semibold text-white/52">
                  {detail}
                </p>
              </>
            );
            const className =
              "rounded-[22px] border border-white/10 bg-white/[0.045] p-4 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.065]";
            const style = {
              backgroundImage: `radial-gradient(circle at 88% 12%, ${statAccent}12, transparent 34%)`,
            };

            return href ? (
              <Link key={label} href={href} className={className} style={style}>
                {content}
              </Link>
            ) : (
              <div key={label} className={className} style={style}>
                {content}
              </div>
            );
          })}
        </section>

        {firstReads.length > 0 ? (
          <section className="mt-14">
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[#ffe4a1]/70">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              À lire en premier
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Les portes d&apos;entrée
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {firstReads.map((fact) => (
                <FactLink key={fact.id} accent={accent} fact={fact} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-14 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div
            className="rounded-[28px] border border-white/10 bg-white/[0.045] p-6"
            style={{
              backgroundImage: `radial-gradient(circle at 8% 10%, ${accent}12, transparent 34%)`,
            }}
          >
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-white/50">
              <Compass className="h-4 w-4" style={{ color: accent }} aria-hidden="true" />
              Repères essentiels
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Ce que ce thème permet de comprendre
            </h2>
            <div className="mt-6 flex flex-wrap gap-2">
              {(theme.keywords?.length
                ? theme.keywords
                : [getThemeShortDescription(theme)]
              ).map((keyword, index) => {
                const keywordAccent = keywordAccents[index % keywordAccents.length];

                return (
                  <span
                    key={keyword}
                    className="rounded-full border px-4 py-2 text-sm font-bold text-white/74"
                    style={{
                      backgroundColor: `${keywordAccent}12`,
                      borderColor: `${keywordAccent}30`,
                    }}
                  >
                    {keyword}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/18 p-6">
            <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-white/50">
              <Brain className="h-4 w-4 text-[#a78bfa]" aria-hidden="true" />
              Les plus structurants
            </p>
            <div className="mt-5 divide-y divide-white/10">
              {popularFacts.map((fact) => (
                <Link
                  key={fact.id}
                  href={`/fait/${fact.slug}`}
                  className="group flex items-start justify-between gap-4 py-4 transition hover:translate-x-1 hover:text-[#ffe4a1]"
                >
                  <span>
                    <span className="block font-extrabold tracking-[-0.03em]">
                      {fact.title}
                    </span>
                    <span className="mt-2 line-clamp-2 text-sm leading-6 text-white/54">
                      {fact.hook || fact.content}
                    </span>
                  </span>
                  <ChevronRight
                    className="mt-1 h-4 w-4 shrink-0 text-white/32 transition group-hover:text-[#ffe4a1]"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {recentFacts.length > 0 ? (
          <section className="mt-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[#ffe4a1]/70">
                  <Library className="h-4 w-4" aria-hidden="true" />
                  Bibliothèque
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Tous les faits du thème
                </h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentFacts.map((fact) => (
                <FactLink key={fact.id} accent={accent} fact={fact} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
