"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/web";
import { getExplorerData } from "@/lib/facts";
import type { CategorySummary, FeedFact } from "@/lib/facts";
import { getToneBackground } from "@/lib/gradients";
import { AppState } from "../components/AppState";
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

function ExplorerSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="min-h-[180px] rounded-lg border border-white/10 bg-white/[0.055] p-5"
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
    <article className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20">
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

function ThemeCard({ theme }: { theme: CategorySummary }) {
  const toneBackground = getToneBackground(theme.tone);
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
      className={`group relative min-h-[205px] overflow-hidden rounded-lg border border-white/10 ${toneBackground.className} p-6 shadow-[0_28px_90px_rgba(0,0,0,0.2)] transition hover:-translate-y-1 hover:border-white/25`}
      style={toneBackground.style}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_26%),linear-gradient(180deg,transparent,rgba(0,0,0,0.42))]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-3xl font-extrabold tracking-[-0.05em]">
            {theme.name}
          </h3>
          <span className="rounded-full bg-black/20 px-3 py-1 text-sm font-bold backdrop-blur">
            {count}
          </span>
        </div>
        <p className="mt-12 max-w-[220px] text-sm font-medium text-white/78">
          {count > 0
            ? `${count} faits publiés`
            : "Thème prêt à accueillir de nouveaux faits"}
        </p>
      </div>
    </Link>
  );
}

export default function ExplorerPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [themes, setThemes] = useState<CategorySummary[]>([]);
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [recentFacts, setRecentFacts] = useState<FeedFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = submittedQuery.trim().toLowerCase();
  const hasActiveSearch = normalizedQuery.length > 0;
  const [sessionSeed] = useState(() => `${Date.now()}:${Math.random()}`);
  const visibleFacts = useMemo(() => {
    const selectedFacts = hasActiveSearch
      ? facts
      : shuffleItems(facts, `${sessionSeed}:facts`);

    return selectedFacts.slice(0, hasActiveSearch ? 24 : 6);
  }, [facts, hasActiveSearch, sessionSeed]);
  const visibleThemes = useMemo(() => {
    const selectedThemes = hasActiveSearch
      ? themes
      : shuffleItems(themes, `${sessionSeed}:themes`);

    return selectedThemes.slice(0, hasActiveSearch ? 18 : 6);
  }, [hasActiveSearch, sessionSeed, themes]);
  const visibleRecentFacts = recentFacts.slice(0, 6);

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
      setRecentFacts(data.recentFacts);
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
    if (nextQuery) {
      void trackAnalyticsEvent({
        eventName: "search_used",
        metadata: { query: nextQuery },
      });
    }
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

      <main className="relative z-10 mx-auto w-full max-w-[1180px] px-6 py-12 sm:py-16 lg:px-8">
        <section className="flex min-h-[72vh] flex-col justify-center gap-10 pb-14 pt-6 text-center">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 inline-flex w-fit rounded-full bg-white/[0.055] px-3 py-1 text-sm/6 font-semibold text-white/62 ring-1 ring-white/10 backdrop-blur-xl">
              Explorer
            </div>

            <h1 className="bg-[linear-gradient(120deg,#ffffff_0%,#ffe4a1_40%,#6ae3c0_78%,#ffffff_100%)] bg-clip-text text-[clamp(2.6rem,6vw,5.2rem)] font-extrabold leading-[0.98] text-transparent [text-wrap:balance]">
              Trouve le fait qui va te rester en tête.
            </h1>

            <form
              onSubmit={submitSearch}
              className="mx-auto mt-10 flex max-w-3xl items-center gap-3 rounded-[22px] border border-white/12 bg-white/[0.075] px-4 py-3 text-left text-white shadow-[0_24px_80px_rgba(0,0,0,0.28),0_0_60px_rgba(106,227,192,0.10)] backdrop-blur-2xl transition focus-within:border-[#6ae3c0]/45 focus-within:bg-white/[0.095] focus-within:shadow-[0_28px_95px_rgba(0,0,0,0.32),0_0_70px_rgba(106,227,192,0.18)] sm:px-5"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-white/8 text-[#6ae3c0]">
                <SearchIcon />
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    runSearch();
                  }
                }}
                placeholder="Ocean, NASA, cerveau, histoire, Einstein..."
                className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/42"
              />
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
                className="rounded-[14px] bg-gradient-to-r from-[#ffd166] to-[#6ae3c0] px-4 py-2 text-sm font-extrabold text-[#07111f] shadow-[0_12px_34px_rgba(255,209,102,0.2)] transition hover:-translate-y-0.5 active:translate-y-0"
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
                    className="rounded-[14px] bg-gradient-to-r from-[#ffd166] to-[#6ae3c0] px-4 py-3 text-sm font-extrabold text-[#07111f]"
                  >
                    Découvrir les faits
                  </Link>
                </div>
              </div>
            )}
          </section>
        ) : (
          <>
        <section className="pb-12">
          <div className="mb-6 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
                À découvrir
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">
                Faits aléatoires
              </h2>
            </div>
              <Link href="/discover" className="text-sm font-bold text-[#ffd166]">
                Ouvrir le flux
              </Link>
          </div>

          {isLoading ? (
            <ExplorerSkeleton />
          ) : visibleFacts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleFacts.map((fact) => (
                <FactCard key={fact.id} fact={fact} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.055] p-6 text-sm text-white/62">
              Aucun fait ne correspond à cette recherche.
            </div>
          )}
        </section>

        <section className="pb-12">
          <div className="mb-6 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
                Thèmes
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">
                Thèmes à explorer
              </h2>
            </div>
          </div>

          {isLoading ? (
            <ExplorerSkeleton />
          ) : visibleThemes.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleThemes.map((theme) => (
                <ThemeCard key={theme.id} theme={theme} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.055] p-6 text-sm text-white/62">
              Aucun thème ne correspond à cette recherche.
            </div>
          )}
        </section>

          <section className="pb-20">
            <div className="mb-6 flex items-end justify-between gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
                  Récemment ajoutés
                </p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">
                  Les derniers faits publiés
                </h2>
              </div>
            </div>

            {isLoading ? (
              <ExplorerSkeleton />
            ) : visibleRecentFacts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleRecentFacts.map((fact) => (
                  <FactCard key={fact.id} fact={fact} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-white/10 bg-white/[0.055] p-6 text-sm text-white/62">
                Aucun fait publié pour le moment.
              </div>
            )}
          </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
