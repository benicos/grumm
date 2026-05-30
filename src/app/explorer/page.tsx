"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { ArrowUpRight, Compass, Search } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/web";
import {
  getExplorerData,
  getThemeDiscoverySummaries,
  type FeedFact,
  type ThemeDiscoverySummary,
} from "@/lib/facts";
import { getToneBackground } from "@/lib/gradients";
import { AppState } from "../components/AppState";
import {
  premiumPrimaryCtaClassName,
  premiumTitleGradientClassName,
} from "../components/buttonStyles";
import Footer from "../components/Footer";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

function ExplorerSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="min-h-[250px] animate-pulse rounded-[30px] border border-white/10 bg-white/[0.055]"
        />
      ))}
    </div>
  );
}

function SearchResultCard({ fact }: { fact: FeedFact }) {
  const toneBackground = getToneBackground(fact.tone);

  return (
    <Link
      href={`/fact/${fact.slug}`}
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

function ThemeCard({ theme }: { theme: ThemeDiscoverySummary }) {
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
      className={`group relative min-h-[300px] overflow-hidden rounded-[34px] border border-white/10 ${toneBackground.className} p-7 shadow-[0_34px_110px_rgba(0,0,0,0.30)] transition duration-500 hover:-translate-y-1.5 hover:border-white/24 hover:shadow-[0_44px_130px_rgba(0,0,0,0.44)]`}
      style={toneBackground.style}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_16%,rgba(255,255,255,0.26),transparent_24%),radial-gradient(circle_at_16%_88%,rgba(244,234,213,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.66))]" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-4">
          <span
            className="h-2 w-14 rounded-full"
            style={{ backgroundColor: theme.accent }}
          />
          <span className="rounded-full border border-white/12 bg-black/24 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white/72 backdrop-blur-xl">
            {count} {count > 1 ? "faits" : "fait"}
          </span>
        </div>

        <div className="mt-auto pt-20">
          <h3 className="max-w-[13ch] text-[clamp(2.4rem,7vw,4.6rem)] font-black leading-[0.9] tracking-[-0.06em] text-white">
            {theme.name}
          </h3>
          <p className="mt-5 max-w-xl text-[15px] font-semibold leading-7 text-white/76">
            {theme.description}
          </p>
          <span className="mt-7 inline-flex items-center gap-2 text-sm font-black text-white transition group-hover:translate-x-1">
            Explorer le thème
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasActiveSearch = submittedQuery.trim().length > 0;
  const visibleThemes = useMemo(() => themes.slice(0, 4), [themes]);

  const loadExplorer = useCallback(async (searchValue?: string) => {
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
        setThemes([]);
        void trackAnalyticsEvent({ eventName: "explorer_search", metadata });

        if (noResult) {
          void trackAnalyticsEvent({
            eventName: "explorer_search_no_result",
            metadata,
          });
        }
      } else {
        setFacts([]);
        setThemes(await getThemeDiscoverySummaries(4));
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
    <div
      className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#07111f] text-white`}
    >
      <HeroBackground />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-[1120px] px-5 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="mx-auto flex min-h-[58vh] max-w-4xl flex-col items-center justify-center pb-12 pt-8 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-sm/6 font-semibold text-white/62 backdrop-blur-xl">
            <Compass className="h-4 w-4" />
            Explorer
          </p>
          <h1
            className={`${premiumTitleGradientClassName} mt-5 max-w-4xl text-[clamp(2.8rem,9vw,6.6rem)] font-black leading-[0.9] tracking-[-0.065em]`}
          >
            Trouve le sujet que tu veux comprendre.
          </h1>
          <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-white/62 sm:text-lg">
            Recherche un thème, une notion, une œuvre ou un personnage.
            Découvrir reste le flux principal ; Explorer sert à viser juste.
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
                placeholder="Psychologie, histoire, cinéma, espace..."
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
              className={`${premiumPrimaryCtaClassName} rounded-[15px] px-5 py-3`}
            >
              Rechercher
            </button>
          </form>
        </section>

        {hasActiveSearch ? (
          <section className="pb-20">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f4ead5]">
                  Recherche
                </p>
                <h2 className="mt-2 text-[clamp(1.8rem,5vw,3rem)] font-black tracking-[-0.055em] text-white">
                  Résultats pour "{submittedQuery}"
                </h2>
              </div>
            </div>
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
          </section>
        ) : (
          <section className="pb-20">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f4ead5]">
                  Thèmes populaires
                </p>
                <h2 className="mt-2 text-[clamp(1.9rem,5vw,3.2rem)] font-black tracking-[-0.055em] text-white">
                  Quelques portes d'entrée.
                </h2>
              </div>
              <Link
                href="/discover/theme"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-5 py-3 text-sm font-black text-white transition hover:border-white/24 hover:bg-white/[0.11]"
              >
                Tous les thèmes
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            {isLoading ? (
              <ExplorerSkeleton cards={4} />
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {visibleThemes.map((theme) => (
                  <ThemeCard key={`${theme.id}:${theme.slug}`} theme={theme} />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
