"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { Compass, Search, Shuffle } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/web";
import {
  getExplorerData,
  getPopularExplorerSearches,
  getThemeDiscoverySummaries,
  type FeedFact,
  type ThemeDiscoverySummary,
} from "@/lib/facts";
import { getToneBackground } from "@/lib/gradients";
import { getUserProfileSummary } from "@/lib/profile";
import { AppState } from "./AppState";
import {
  premiumTitleGradientClassName,
} from "./buttonStyles";
import Footer from "./Footer";
import HeroBackground from "./HeroBackground";
import Navbar from "./Navbar";
import ThemeCard from "./ThemeCard";
import { useAuth } from "../auth/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

function ExplorerSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="min-h-[250px] animate-pulse rounded-[30px] border border-white/10 bg-white/[0.055]"
        />
      ))}
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f4ead5]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-[clamp(1.9rem,5vw,3.2rem)] font-black tracking-[-0.055em] text-white">
        {title}
      </h2>
    </div>
  );
}

function SearchResultCard({ fact }: { fact: FeedFact }) {
  const toneBackground = getToneBackground(fact.tone);

  return (
    <Link
      href={`/fait/${fact.slug}`}
      className={`group relative min-h-[230px] overflow-hidden rounded-[26px] border border-white/10 ${toneBackground.className} p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-white/24`}
      style={toneBackground.style}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.20),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.66))]" />
      <div className="relative flex h-full flex-col">
        <span className="w-fit rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white/78 backdrop-blur-xl">
          {fact.category}
        </span>
        <div className="mt-auto pt-12">
          <h3 className="text-2xl font-black leading-tight tracking-[-0.045em] text-white">
            {fact.title}
          </h3>
          <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-white/68">
            {fact.hook ?? fact.detail}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function ExplorerExperience() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [allThemes, setAllThemes] = useState<ThemeDiscoverySummary[]>([]);
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [themeProgress, setThemeProgress] = useState<Record<string, number>>({});
  const [themePage, setThemePage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasActiveSearch = submittedQuery.trim().length > 0;

  const randomTheme = useMemo(() => {
    if (allThemes.length === 0) {
      return null;
    }

    const signature = allThemes.map((theme) => theme.slug).join("|");
    const index = [...signature].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    ) % allThemes.length;

    return allThemes[index];
  }, [allThemes]);
  const pageSize = 6;
  const themePageCount = Math.max(1, Math.ceil(allThemes.length / pageSize));
  const safeThemePage = Math.min(themePage, themePageCount);
  const visibleThemes = allThemes.slice(
    (safeThemePage - 1) * pageSize,
    safeThemePage * pageSize,
  );

  const loadExplorer = useCallback(
    async (searchValue?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const searchTerm = searchValue?.trim();

        if (searchTerm) {
          const data = await getExplorerData({ query: searchTerm });
          const noResult = data.facts.length === 0;
          const metadata = {
            no_result: noResult,
            result_count: data.facts.length,
            term: searchTerm,
            theme_result_count: data.categories.length,
          };

          setFacts(data.facts);
          void trackAnalyticsEvent({ eventName: "explorer_search", metadata });

          if (noResult) {
            void trackAnalyticsEvent({
              eventName: "explorer_search_no_result",
              metadata,
            });
          }
        } else {
          setFacts([]);
          const [themes, searches] = await Promise.all([
            getThemeDiscoverySummaries(120),
            getPopularExplorerSearches(6),
          ]);
          setAllThemes(themes);
          setPopularSearches(searches);

          if (isAuthenticated) {
            try {
              const profile = await getUserProfileSummary();
              setThemeProgress(
                Object.fromEntries(
                  profile.topThemes.map((theme) => [theme.slug, theme.count]),
                ),
              );
            } catch {
              setThemeProgress({});
            }
          } else {
            setThemeProgress({});
          }
          setThemePage(1);
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
    },
    [isAuthenticated],
  );

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    queueMicrotask(() => {
      void loadExplorer();
    });
  }, [isAuthLoading, loadExplorer]);

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
        primaryHref="/decouvrir"
        primaryLabel="Ouvrir Découvrir"
        secondaryHref="/"
        secondaryLabel="Accueil"
      />
    );
  }

  return (
    <div
      className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#07111f] text-white`}
    >
      <HeroBackground />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="mx-auto flex max-w-4xl flex-col items-center pb-10 pt-8 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-sm/6 font-semibold text-white/62 backdrop-blur-xl">
            <Compass className="h-4 w-4" />
            Explorer
          </p>
          <h1
            className={`${premiumTitleGradientClassName} mt-5 max-w-3xl text-[clamp(2.25rem,5.8vw,4.35rem)] font-black leading-[0.98] tracking-[-0.045em]`}
          >
            Que veux-tu apprendre aujourd&apos;hui ?
          </h1>
          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-white/62 sm:text-lg">
            Trouve un thème, une époque, une oeuvre ou une idée, puis laisse
            Grumm. t&apos;ouvrir la bonne porte.
          </p>

          <form
            onSubmit={submitSearch}
            className="mt-9 flex w-full max-w-3xl flex-col gap-3 rounded-[24px] border border-white/12 bg-white/[0.085] px-3 py-3 shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur-2xl transition focus-within:border-[#f4ead5]/50 sm:flex-row sm:items-center sm:px-5"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-white/8 text-[#f4ead5]">
                <Search className="h-5 w-5" />
              </span>
              <input
                id="explorer-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rome antique, espace, psychologie..."
                className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/42"
              />
            </div>
            {hasActiveSearch ? (
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-[15px] border border-white/10 px-4 py-2.5 text-sm font-extrabold text-white/62 transition hover:border-white/20 hover:text-white"
              >
                Effacer
              </button>
            ) : null}
            <button
              type="submit"
              className="rounded-[15px] bg-gradient-to-r from-[#ffd166] to-[#f4ead5] px-5 py-3 text-sm font-black text-[#07111f] shadow-[0_16px_45px_rgba(255,209,102,0.22)] transition hover:scale-[1.02]"
            >
              Rechercher
            </button>
          </form>
        </section>

        {hasActiveSearch ? (
          <section className="pb-20">
            <SectionTitle
              eyebrow="Recherche"
              title={`Résultats pour "${submittedQuery}"`}
            />
            <div className="mt-6">
              {isLoading ? (
                <ExplorerSkeleton cards={6} />
              ) : facts.length > 0 ? (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {facts.slice(0, 24).map((fact) => (
                    <SearchResultCard key={fact.id} fact={fact} />
                  ))}
                </div>
              ) : (
                <div className="rounded-[28px] border border-white/10 bg-white/[0.065] p-7 text-center text-white/68 backdrop-blur-2xl">
                  Aucun fait ne correspond à cette recherche.
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="space-y-14 pb-20">
            <section className="grid gap-5 rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.24)] backdrop-blur-2xl md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#6ae3c0]">
                  <Shuffle className="h-4 w-4" />
                  Pas d&apos;idée ?
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.055em] text-white">
                  Laisse Grumm. choisir une direction.
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/56">
                  Un thème au hasard, pour ouvrir une porte sans réfléchir.
                </p>
              </div>
              <Link
                href={randomTheme ? `/theme/${randomTheme.slug}` : "/decouvrir"}
                className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#6ae3c0] to-[#9ff5df] px-5 text-sm font-black text-[#06111d] shadow-[0_18px_55px_rgba(106,227,192,0.20)] transition hover:scale-[1.02]"
              >
                Découvrir un thème au hasard
              </Link>
            </section>

            {popularSearches.length > 0 ? (
              <section>
                <SectionTitle
                  eyebrow="Recherches populaires"
                  title="Ce que les lecteurs cherchent."
                />
                <div className="mt-6 flex flex-wrap gap-3">
                  {popularSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => runSearch(term)}
                      className="rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white/72 transition hover:border-white/24 hover:bg-white/[0.10] hover:text-white"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
                <SectionTitle
                  eyebrow="Thèmes"
                  title="Tous les thèmes."
                />
              </div>
              {isLoading ? (
                <ExplorerSkeleton cards={6} />
              ) : (
                <>
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {visibleThemes.map((theme) => (
                    <ThemeCard
                      key={`${theme.id}:${theme.slug}`}
                      progress={
                        isAuthenticated
                          ? {
                              discovered: themeProgress[theme.slug] ?? 0,
                              total: theme.count ?? 0,
                            }
                          : null
                      }
                      theme={theme}
                    />
                  ))}
                  </div>
                  {themePageCount > 1 ? (
                    <div className="mt-7 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        disabled={safeThemePage <= 1}
                        onClick={() => setThemePage((page) => Math.max(1, page - 1))}
                        className="rounded-full border border-white/12 px-4 py-2 text-sm font-bold text-white/68 transition hover:border-white/24 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Précédent
                      </button>
                      <span className="text-sm font-bold text-white/48">
                        {safeThemePage} / {themePageCount}
                      </span>
                      <button
                        type="button"
                        disabled={safeThemePage >= themePageCount}
                        onClick={() =>
                          setThemePage((page) => Math.min(themePageCount, page + 1))
                        }
                        className="rounded-full border border-white/12 px-4 py-2 text-sm font-bold text-white/68 transition hover:border-white/24 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Suivant
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
