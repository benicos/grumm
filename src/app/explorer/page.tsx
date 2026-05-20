"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getExplorerData } from "@/lib/facts";
import type { CategorySummary, FeedFact } from "@/lib/facts";
import { getToneBackground } from "@/lib/gradients";
import { AppState } from "../components/AppState";
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
    <Link
      href={`/fact/${fact.slug}`}
      className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-1 hover:border-white/20"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#ffd166]">
          {fact.category}
        </span>
        <span className="truncate text-xs text-white/42">{fact.source}</span>
      </div>
      <h3 className="text-xl font-extrabold leading-snug tracking-[-0.04em]">
        {fact.title}
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/62">
        {fact.detail}
      </p>
    </Link>
  );
}

function ThemeCard({ theme }: { theme: CategorySummary }) {
  const toneBackground = getToneBackground(theme.tone);
  const count = theme.count ?? 0;

  return (
    <Link
      href={`/discover/theme/${theme.slug}`}
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
  const [themes, setThemes] = useState<CategorySummary[]>([]);
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [recentFacts, setRecentFacts] = useState<FeedFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const [sessionSeed] = useState(() => `${Date.now()}:${Math.random()}`);
  const visibleFacts = useMemo(() => {
    const selectedFacts = normalizedQuery
      ? facts
      : shuffleItems(facts, `${sessionSeed}:facts`);

    return selectedFacts.slice(0, normalizedQuery ? 12 : 6);
  }, [facts, normalizedQuery, sessionSeed]);
  const visibleThemes = useMemo(() => {
    const selectedThemes = normalizedQuery
      ? themes
      : shuffleItems(themes, `${sessionSeed}:themes`);

    return selectedThemes.slice(0, normalizedQuery ? 18 : 6);
  }, [normalizedQuery, sessionSeed, themes]);
  const visibleRecentFacts = recentFacts.slice(0, 6);

  useEffect(() => {
    let isMounted = true;

    const timeout = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getExplorerData({
          query: normalizedQuery || undefined,
        });

        if (!isMounted) {
          return;
        }

        setThemes(data.categories);
        setFacts(data.facts);
        setRecentFacts(data.recentFacts);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Explorer est indisponible.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }, normalizedQuery ? 240 : 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [normalizedQuery]);

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
      className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#132338] text-white`}
    >
      <HeroBackground />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-[1180px] px-6 py-12 sm:py-16 lg:px-8">
        <section className="flex min-h-[72vh] flex-col justify-center gap-10 pb-14 pt-6 text-center">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 inline-flex w-fit rounded-full bg-white/[0.055] px-3 py-1 text-sm/6 font-semibold text-white/62 ring-1 ring-white/10 backdrop-blur-xl">
              Explorer
            </div>

            <h1 className="text-[clamp(2.5rem,6vw,5.2rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-white">
              Trouve le fait qui va te rester en tête.
            </h1>

            <label className="mx-auto mt-10 flex max-w-3xl items-center gap-3 rounded-md bg-white/[0.07] px-5 py-4 text-left text-white shadow-sm ring-1 ring-white/10 backdrop-blur-xl">
              <SearchIcon />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ocean, NASA, cerveau, histoire, Einstein..."
                className="w-full bg-transparent text-base text-white outline-none placeholder:text-white/42"
              />
            </label>
          </div>
        </section>

        <section className="pb-12">
          <div className="mb-6 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
                {normalizedQuery ? "Recherche" : "À découvrir"}
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.04em]">
                {normalizedQuery ? "Résultats pertinents" : "Faits aléatoires"}
              </h2>
            </div>
            {!normalizedQuery && (
              <Link href="/discover" className="text-sm font-bold text-[#ffd166]">
                Ouvrir le flux
              </Link>
            )}
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
                {normalizedQuery ? "Thèmes liés" : "Thèmes à explorer"}
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

        {!normalizedQuery && (
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
        )}
      </main>
      <Footer />
    </div>
  );
}
