"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { Search, Shuffle } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/web";
import {
  getExplorerData,
  getThemeDiscoverySummaries,
  type FeedFact,
  type ThemeDiscoverySummary,
} from "@/lib/facts";
import { getUserThemeProgress } from "@/lib/profile";
import { AppState } from "./AppState";
import { premiumTitleGradientClassName } from "./buttonStyles";
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
      <h2 className="mt-2 text-[clamp(1.55rem,4vw,2.45rem)] font-black tracking-[-0.045em] text-white">
        {title}
      </h2>
    </div>
  );
}

function SearchResultCard({ fact }: { fact: FeedFact }) {
  const accent = fact.accent || "#ffd166";

  return (
    <Link
      href={`/fait/${fact.slug}`}
      className="group relative min-h-[230px] overflow-hidden rounded-[26px] border border-white/10 bg-[#0a1728]/88 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-white/24"
      style={{
        backgroundImage: `radial-gradient(circle at 82% 18%, ${accent}22, transparent 28%), linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          backgroundImage: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />
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
  const [themeProgress, setThemeProgress] = useState<Record<string, number>>({});
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
          const themes = await getThemeDiscoverySummaries(120);
          setAllThemes(themes);

          if (isAuthenticated) {
            try {
              setThemeProgress(await getUserThemeProgress());
            } catch {
              setThemeProgress({});
            }
          } else {
            setThemeProgress({});
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

      <main className="relative z-10 mx-auto w-full max-w-[1180px] px-5 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8">
        <section className="mx-auto flex max-w-4xl flex-col items-center pb-5 pt-3 text-center sm:pb-6 lg:pb-7">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#f4ead5]/58">
            Explorer
          </p>
          <h1
            className={`${premiumTitleGradientClassName} mt-3 max-w-2xl text-[clamp(1.75rem,4vw,2.55rem)] font-black leading-[1.04] tracking-[-0.04em]`}
          >
            Explore les grandes idées.
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/58">
            Histoire, science, art, géographie, cinéma… choisis un territoire
            et commence à découvrir.
          </p>
          <form
            onSubmit={submitSearch}
            className="mt-4 flex w-full max-w-3xl flex-col gap-3 rounded-[22px] border border-white/12 bg-white/[0.085] px-3 py-2.5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl transition focus-within:border-[#f4ead5]/50 sm:flex-row sm:items-center sm:px-4"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[15px] bg-white/8 text-[#f4ead5]">
                <Search className="h-5 w-5" />
              </span>
              <label htmlFor="explorer-search" className="sr-only">
                Rechercher un thème, une époque ou une idée
              </label>
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
          <div className="space-y-8 pb-16">
            <section className="grid gap-5 rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.24)] backdrop-blur-2xl md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#6ae3c0]">
                  <Shuffle className="h-4 w-4" />
                  Pas d&apos;idée ?
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-[-0.055em] text-white">
                  Laisse Grumm choisir une direction.
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

            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-5">
                <SectionTitle
                  eyebrow="Thèmes"
                  title="Tous les thèmes."
                />
              </div>
              {isLoading ? (
                <ExplorerSkeleton cards={6} />
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {allThemes.map((theme) => (
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
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
