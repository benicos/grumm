"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { ArrowUpRight, BookOpen, CalendarDays, Compass, Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/web";
import {
  getExplorerData,
  getThemeDiscoverySummaries,
  getTodayEventFact,
  type FeedFact,
  type ThemeDiscoverySummary,
} from "@/lib/facts";
import { getToneBackground } from "@/lib/gradients";
import { AppState } from "../components/AppState";
import {
  premiumPrimaryCtaClassName,
  premiumTitleGradientClassName,
} from "../components/buttonStyles";
import FactSource from "../components/FactSource";
import Footer from "../components/Footer";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const editorialCollections = [
  {
    description: "Inventions, découvertes et objets qui ont déplacé les limites du possible.",
    label: "Les grandes inventions",
    query: "invention",
  },
  {
    description: "Planètes, missions et phénomènes qui donnent envie de lever les yeux.",
    label: "Les mystères de l'espace",
    query: "espace",
  },
  {
    description: "Repères, dates et personnages pour mieux comprendre notre récit commun.",
    label: "Comprendre l'Histoire de France",
    query: "histoire france",
  },
  {
    description: "Peintures, livres, films et musiques à avoir quelque part en mémoire.",
    label: "Les œuvres à connaître",
    query: "oeuvre",
  },
  {
    description: "Figures scientifiques, politiques et artistiques qui ont changé leur époque.",
    label: "Les personnalités incontournables",
    query: "personnalité",
  },
  {
    description: "Les moments précis où une décision, une idée ou un événement a tout changé.",
    label: "Les dates qui ont changé le monde",
    query: "date",
  },
];

function ExplorerSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="min-h-[220px] animate-pulse rounded-[26px] border border-white/10 bg-white/[0.055]"
        />
      ))}
    </div>
  );
}

function SectionHeader({
  action,
  eyebrow,
  title,
}: {
  action?: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffd166]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-[clamp(1.9rem,5vw,3.2rem)] font-black tracking-[-0.055em] text-white">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function FactCard({ fact, large = false }: { fact: FeedFact; large?: boolean }) {
  const toneBackground = getToneBackground(fact.tone);

  return (
    <article
      className={`group relative overflow-hidden rounded-[26px] border border-white/10 ${toneBackground.className} p-5 shadow-[0_26px_90px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-1 hover:border-white/24 ${
        large ? "min-h-[300px] sm:p-7" : "min-h-[220px]"
      }`}
      style={toneBackground.style}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.22),transparent_25%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.62))]" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/theme/${fact.categorySlug}`}
            className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/78 backdrop-blur-xl"
          >
            {fact.category}
          </Link>
          <FactSource
            className="max-w-[42%] text-xs text-white/42"
            label=""
            source={fact.source}
            sourceUrl={fact.sourceUrl}
          />
        </div>

        <Link href={`/fact/${fact.slug}`} className="mt-auto block pt-12">
          <h3 className={`${large ? "text-3xl" : "text-xl"} font-black leading-tight tracking-[-0.045em] text-white`}>
            {fact.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-white/68">
            {fact.detail}
          </p>
        </Link>
      </div>
    </article>
  );
}

function ThemeCard({ theme, featured = false }: { featured?: boolean; theme: ThemeDiscoverySummary }) {
  const toneBackground = getToneBackground(theme.tone);
  const count = theme.count ?? 0;

  return (
    <Link
      href={`/theme/${theme.slug}`}
      onClick={() =>
        void trackAnalyticsEvent({
          entityId: theme.id,
          entityType: "category",
          eventName: "category_opened",
          metadata: { name: theme.name, slug: theme.slug },
        })
      }
      className={`group relative min-h-[300px] overflow-hidden rounded-[30px] border border-white/10 ${toneBackground.className} p-6 shadow-[0_30px_100px_rgba(0,0,0,0.26)] transition duration-500 hover:-translate-y-1.5 hover:border-white/24 hover:shadow-[0_40px_120px_rgba(0,0,0,0.42)] ${
        featured ? "md:col-span-2 md:min-h-[360px]" : ""
      }`}
      style={toneBackground.style}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.24),transparent_25%),radial-gradient(circle_at_18%_82%,rgba(255,209,102,0.16),transparent_29%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.64))]" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-5">
          <span
            className="grid h-14 w-14 place-items-center rounded-[20px] border border-white/14 bg-black/20 text-xl font-black text-white backdrop-blur-xl"
            style={{ boxShadow: `0 18px 50px ${theme.accent}26` }}
          >
            {theme.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="rounded-full border border-white/12 bg-black/24 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white/74 backdrop-blur-xl">
            {count} {count > 1 ? "faits" : "fait"}
          </span>
        </div>

        <div className="mt-auto pt-16">
          <h3 className="max-w-[12ch] text-[clamp(2.1rem,6vw,4.2rem)] font-black leading-[0.92] tracking-[-0.055em] text-white">
            {theme.name}
          </h3>
          <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-white/76">
            {theme.description}
          </p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/12 px-4 py-2 text-sm font-extrabold text-white transition group-hover:border-white/24 group-hover:bg-white/18">
            Explorer ce thème
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function ExplorerPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [themes, setThemes] = useState<ThemeDiscoverySummary[]>([]);
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [recentFacts, setRecentFacts] = useState<FeedFact[]>([]);
  const [todayFact, setTodayFact] = useState<FeedFact | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasActiveSearch = submittedQuery.trim().length > 0;

  const visibleThemes = useMemo(() => themes.slice(0, 7), [themes]);
  const popularFacts = useMemo(() => facts.slice(0, 6), [facts]);
  const newsFacts = useMemo(() => recentFacts.slice(0, 4), [recentFacts]);

  const loadExplorer = useCallback(async (searchValue?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const searchTerm = searchValue?.trim();
      const [data, themeData, todayData] = await Promise.all([
        getExplorerData({ query: searchTerm || undefined }),
        searchTerm ? Promise.resolve([]) : getThemeDiscoverySummaries(20),
        searchTerm ? Promise.resolve({ fact: null }) : getTodayEventFact(),
      ]);

      setThemes(themeData);
      setFacts(data.facts);
      setRecentFacts(data.recentFacts);
      setTodayFact(todayData.fact ?? null);

      if (searchTerm) {
        const noResult = data.facts.length === 0;
        const metadata = {
          no_result: noResult,
          result_count: data.facts.length,
          term: searchTerm,
          theme_result_count: data.categories.length,
        };

        void trackAnalyticsEvent({ eventName: "explorer_search", metadata });

        if (noResult) {
          void trackAnalyticsEvent({
            eventName: "explorer_search_no_result",
            metadata,
          });
        }
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Explorer est indisponible.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadExplorer();
    });
  }, [loadExplorer]);

  function runSearch(nextQuery = query) {
    const searchTerm = nextQuery.trim();
    setSubmittedQuery(searchTerm);
    setQuery(searchTerm);
    void loadExplorer(searchTerm || undefined);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch();
  }

  function clearSearch() {
    setQuery("");
    setSubmittedQuery("");
    void loadExplorer();
  }

  if (error && !isLoading) {
    return (
      <AppState
        eyebrow="Explorer"
        title="Impossible de charger Explorer."
        description={error}
        primaryHref="/discover"
        primaryLabel="Ouvrir Découvrir"
        secondaryHref="/"
        secondaryLabel="Accueil"
      />
    );
  }

  return (
    <div className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#07111f] text-white`}>
      <HeroBackground />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="grid min-h-[72vh] gap-8 pb-14 pt-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-sm/6 font-semibold text-white/62 backdrop-blur-xl">
              <Compass className="h-4 w-4" />
              Catalogue Grumm.
            </p>
            <h1 className={`${premiumTitleGradientClassName} mt-5 max-w-4xl text-[clamp(2.7rem,9vw,6.8rem)] font-black leading-[0.9] tracking-[-0.065em]`}>
              Explore les sujets qui façonnent notre culture.
            </h1>
            <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-white/64 sm:text-lg">
              Thèmes, collections, faits populaires et repères du jour : tout
              ce qui donne envie d'ouvrir une porte de plus.
            </p>

            <form
              onSubmit={submitSearch}
              className="mt-8 flex w-full max-w-3xl flex-col gap-3 rounded-[22px] border border-white/12 bg-white/[0.075] px-3 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition focus-within:border-[#6ae3c0]/45 sm:flex-row sm:items-center sm:px-5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-white/8 text-[#6ae3c0]">
                  <Search className="h-5 w-5" />
                </span>
                <input
                  id="explorer-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Science, histoire, cinéma, espace..."
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/42"
                />
              </div>
              {hasActiveSearch ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="rounded-[14px] border border-white/10 px-4 py-2 text-sm font-extrabold text-white/62 transition hover:border-white/20 hover:text-white"
                >
                  Effacer
                </button>
              ) : null}
              <button type="submit" className={`${premiumPrimaryCtaClassName} rounded-[14px] px-4 py-2.5`}>
                Rechercher
              </button>
            </form>
          </div>

          {todayFact ? (
            <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.20em] text-[#ffd166]">
                <CalendarDays className="h-4 w-4" />
                Aujourd'hui
              </div>
              <FactCard fact={todayFact} large />
            </div>
          ) : null}
        </section>

        {hasActiveSearch ? (
          <section className="pb-20">
            <SectionHeader
              eyebrow="Recherche"
              title={`Résultats pour “${submittedQuery}”`}
            />
            {isLoading ? (
              <ExplorerSkeleton cards={6} />
            ) : facts.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {facts.slice(0, 24).map((fact) => (
                  <FactCard key={fact.id} fact={fact} />
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.065] p-6 text-white/68 backdrop-blur-2xl">
                Aucun fait ne correspond à cette recherche.
              </div>
            )}
          </section>
        ) : (
          <div className="space-y-16 pb-20">
            <section>
              <SectionHeader
                eyebrow="Thèmes"
                title="Les portes d'entrée de Grumm."
              />
              {isLoading ? (
                <ExplorerSkeleton cards={4} />
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {visibleThemes.map((theme, index) => (
                    <ThemeCard
                      featured={index === 0}
                      key={`${theme.id}:${theme.slug}:${index}`}
                      theme={theme}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionHeader eyebrow="Collections" title="Pistes éditoriales." />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {editorialCollections.map((collection) => (
                  <button
                    type="button"
                    key={collection.label}
                    onClick={() => runSearch(collection.query)}
                    className="group rounded-[24px] border border-white/10 bg-white/[0.055] p-5 text-left shadow-[0_22px_80px_rgba(0,0,0,0.20)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.075]"
                  >
                    <BookOpen className="h-5 w-5 text-[#f4ead5]" />
                    <h3 className="mt-5 text-xl font-black tracking-[-0.04em] text-white">
                      {collection.label}
                    </h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-white/58">
                      {collection.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <SectionHeader
                eyebrow="Populaire"
                title="Faits qui donnent envie de continuer."
                action={
                  <Link href="/discover" className="hidden text-sm font-bold text-[#ffd166] sm:inline-flex">
                    Ouvrir le flux
                  </Link>
                }
              />
              {isLoading ? (
                <ExplorerSkeleton cards={6} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {popularFacts.map((fact) => (
                    <FactCard key={fact.id} fact={fact} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionHeader eyebrow="Nouveautés" title="Fraîchement ajoutés." />
              {newsFacts.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {newsFacts.map((fact) => (
                    <FactCard key={fact.id} fact={fact} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.055] p-6 text-sm font-semibold text-white/62">
                  Les nouveautés apparaîtront ici dès que de nouveaux faits seront publiés.
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
