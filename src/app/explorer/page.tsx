"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/web";
import { getExplorerData } from "@/lib/facts";
import type { CategorySummary, FeedFact } from "@/lib/facts";
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
  weight: ["400", "500", "600", "700", "800"],
});

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="m20 20-4.5-4.5m2-5A7.5 7.5 0 1 1 2.5 10a7.5 7.5 0 0 1 15 0Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ExplorerSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="min-h-[180px] rounded-[22px] border border-white/10 bg-white/[0.055] p-5"
        >
          <div className="h-6 w-28 animate-pulse rounded-full bg-white/10" />
          <div className="mt-16 h-4 w-48 animate-pulse rounded-full bg-white/10" />
          <div className="mt-3 h-4 w-32 animate-pulse rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function stringSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed: number) {
  let value = seed;

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleItems<T>(items: T[], seedKey: string) {
  const random = seededRandom(stringSeed(seedKey));
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function FactCard({ fact }: { fact: FeedFact }) {
  return (
    <article className="rounded-[22px] border border-white/10 bg-white/[0.052] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.20)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#ffd166]">
          {fact.category}
        </span>
        <FactSource
          className="max-w-[48%] text-xs text-white/42"
          label=""
          source={fact.source}
          sourceUrl={fact.sourceUrl}
        />
      </div>
      <Link href={`/fact/${fact.slug}`} className="block">
        <h3 className="text-xl font-extrabold leading-snug tracking-[-0.04em]">
          {fact.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/62">
          {fact.detail}
        </p>
      </Link>
    </article>
  );
}

function ThemePill({ theme }: { theme: CategorySummary }) {
  const count = theme.count ?? 0;

  return (
    <Link
      href={`/discover/theme/${theme.slug}`}
      onClick={() =>
        void trackAnalyticsEvent({
          entityId: theme.id,
          entityType: "category",
          eventName: "category_opened",
          metadata: { name: theme.name, slug: theme.slug },
        })
      }
      className="group flex w-full min-w-0 items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.065] px-4 py-3 text-sm font-extrabold text-white shadow-[0_16px_55px_rgba(0,0,0,0.18)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.09]"
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: theme.accent }}
      />
      <span className="min-w-0 flex-1 break-words text-center sm:truncate">
        {theme.name}
      </span>
      <span className="shrink-0 rounded-full bg-black/22 px-2 py-0.5 text-xs text-white/58">
        {count}
      </span>
    </Link>
  );
}

export default function ExplorerPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [themes, setThemes] = useState<CategorySummary[]>([]);
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = submittedQuery.trim().toLowerCase();
  const hasActiveSearch = normalizedQuery.length > 0;
  const [sessionSeed] = useState(() => `${Date.now()}:${Math.random()}`);
  const visibleFacts = useMemo(() => {
    const selectedFacts = hasActiveSearch
      ? facts
      : shuffleItems(facts, `${sessionSeed}:facts`);

    return selectedFacts.slice(0, hasActiveSearch ? 24 : 3);
  }, [facts, hasActiveSearch, sessionSeed]);
  const visibleThemes = useMemo(() => {
    const selectedThemes = hasActiveSearch
      ? themes
      : shuffleItems(themes, `${sessionSeed}:themes`);

    return selectedThemes.slice(0, hasActiveSearch ? 18 : 8);
  }, [hasActiveSearch, sessionSeed, themes]);

  const loadExplorer = useCallback(async (searchValue?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const searchTerm = searchValue?.trim();
      const data = await getExplorerData({
        query: searchTerm || undefined,
      });

      setThemes(data.categories);
      setFacts(data.facts);

      if (searchTerm) {
        const noResult = data.facts.length === 0;
        const metadata = {
          no_result: noResult,
          result_count: data.facts.length,
          term: searchTerm,
          theme_result_count: data.categories.length,
        };

        void trackAnalyticsEvent({
          eventName: "explorer_search",
          metadata,
        });

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

  function runSearch() {
    const nextQuery = query.trim();
    setSubmittedQuery(nextQuery);
    void loadExplorer(nextQuery || undefined);
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
    <div
      className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#07111f] text-white`}
    >
      <HeroBackground />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-[1180px] min-w-0 px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
        <section className="flex min-h-[72vh] flex-col justify-center gap-10 pb-14 pt-6 text-center">
          <div className="mx-auto w-full max-w-4xl min-w-0">
            <h1 className={`${premiumTitleGradientClassName} mx-auto max-w-full text-[clamp(2rem,9vw,5.2rem)] font-extrabold leading-[1.02] [text-wrap:balance] sm:text-[clamp(2.6rem,6vw,5.2rem)] sm:leading-[0.98]`}>
              Trouve le fait qui va te rester en tête.
            </h1>

            <form
              onSubmit={submitSearch}
              className="mx-auto mt-8 flex w-full max-w-3xl min-w-0 flex-col items-stretch gap-3 rounded-[22px] border border-white/12 bg-white/[0.075] px-3 py-3 text-left text-white shadow-[0_24px_80px_rgba(0,0,0,0.28),0_0_60px_rgba(106,227,192,0.10)] backdrop-blur-2xl transition focus-within:border-[#6ae3c0]/45 focus-within:bg-white/[0.095] focus-within:shadow-[0_28px_95px_rgba(0,0,0,0.32),0_0_70px_rgba(106,227,192,0.18)] sm:mt-10 sm:flex-row sm:items-center sm:px-5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-white/8 text-[#6ae3c0]">
                  <SearchIcon />
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Espace, histoire, psychologie, NASA..."
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/42"
                />
              </div>
              {hasActiveSearch ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="hidden rounded-[14px] border border-white/10 px-4 py-2 text-sm font-extrabold text-white/62 transition hover:border-white/20 hover:text-white sm:inline-flex"
                >
                  Effacer
                </button>
              ) : null}
              <button
                type="submit"
                className={`${premiumPrimaryCtaClassName} w-full rounded-[14px] px-4 py-2.5 sm:w-auto sm:py-2`}
              >
                Rechercher
              </button>
            </form>
          </div>
        </section>

        {hasActiveSearch ? (
          <section className="pb-20">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
                  Recherche
                </p>
                <h2 className="mt-2 text-3xl font-extrabold">
                  Résultats pour “{submittedQuery}”
                </h2>
              </div>
            </div>

            {isLoading ? (
              <ExplorerSkeleton cards={6} />
            ) : visibleFacts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleFacts.map((fact) => (
                  <FactCard key={fact.id} fact={fact} />
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.065] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffd166]">
                  Aucun résultat
                </p>
                <h2 className="mt-3 text-2xl font-extrabold text-white">
                  Aucun fait ne correspond à cette recherche.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
                  Essaie un autre mot-clé ou repars des collections de Grumm. pour
                  découvrir de nouveaux thèmes.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/facts/theme"
                    className="rounded-[14px] border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-extrabold text-white transition hover:border-white/20 hover:bg-white/[0.1]"
                  >
                    Découvrir les thèmes
                  </Link>
                  <Link
                    href="/facts"
                    className={`${premiumPrimaryCtaClassName} rounded-[14px] px-4 py-3`}
                  >
                    Découvrir les faits
                  </Link>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="-mt-10 pb-20">
            {isLoading ? (
              <ExplorerSkeleton cards={3} />
            ) : (
              <div className="space-y-10">
                <div>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
                      Quelques pistes
                    </p>
                    <Link
                      href="/discover/theme"
                      className="text-sm font-bold text-[#f4ead5] transition hover:text-white"
                    >
                      Tous les thèmes
                    </Link>
                  </div>
                  {visibleThemes.length > 0 ? (
                    <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-3 sm:max-w-4xl sm:grid-cols-4">
                      {visibleThemes.map((theme, index) => (
                        <div
                          key={`${theme.id}:${theme.slug}:${index}`}
                          className={index >= 4 ? "hidden sm:block" : ""}
                        >
                          <ThemePill theme={theme} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.055] p-5 text-sm text-white/62">
                      Aucun thème disponible pour le moment.
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-6 flex items-end justify-between gap-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
                        À découvrir
                      </p>
                      <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">
                        Aujourd&apos;hui sur Grumm.
                      </h2>
                    </div>
                    <Link href="/discover" className="text-sm font-bold text-[#ffd166]">
                      Ouvrir le flux
                    </Link>
                  </div>

                  {visibleFacts.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      {visibleFacts.map((fact) => (
                        <FactCard key={fact.id} fact={fact} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.055] p-5 text-sm text-white/62">
                      Aucun fait disponible pour le moment.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
