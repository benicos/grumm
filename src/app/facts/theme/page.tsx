"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { useEffect, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/web";
import { getExplorerData, type CategorySummary } from "@/lib/facts";
import { getToneBackground } from "@/lib/gradients";
import { AppState } from "../../components/AppState";
import Footer from "../../components/Footer";
import HeroBackground from "../../components/HeroBackground";
import Navbar from "../../components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

function ThemeSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="min-h-[190px] animate-pulse rounded-[22px] border border-white/10 bg-white/[0.055]"
        />
      ))}
    </div>
  );
}

function ThemeCard({ theme }: { theme: CategorySummary }) {
  const toneBackground = getToneBackground(theme.tone);

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
      className={`group relative min-h-[210px] overflow-hidden rounded-[24px] border border-white/10 ${toneBackground.className} p-6 shadow-[0_28px_90px_rgba(0,0,0,0.22)] transition hover:-translate-y-1 hover:border-white/25`}
      style={toneBackground.style}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.26),transparent_28%),linear-gradient(180deg,transparent,rgba(0,0,0,0.46))]" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-3xl font-extrabold leading-tight text-white">
            {theme.name}
          </h2>
          <span className="rounded-full bg-black/22 px-3 py-1 text-sm font-extrabold text-white backdrop-blur">
            {theme.count ?? 0}
          </span>
        </div>
        <p className="mt-12 max-w-[230px] text-sm font-semibold leading-6 text-white/76">
          {theme.count && theme.count > 0
            ? `${theme.count} faits publiés à explorer`
            : "Thème prêt à accueillir de nouveaux faits"}
        </p>
      </div>
    </Link>
  );
}

export default function FactsThemePage() {
  const [themes, setThemes] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadThemes() {
      try {
        const data = await getExplorerData();

        if (isMounted) {
          setThemes(data.categories);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Les thèmes sont indisponibles.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadThemes();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error && !isLoading) {
    return (
      <AppState
        eyebrow="Thèmes"
        title="Impossible de charger les thèmes."
        description={error}
        primaryHref="/explorer"
        primaryLabel="Retour à Explorer"
        secondaryHref="/facts"
        secondaryLabel="Découvrir les faits"
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
        <section className="mb-10 max-w-4xl">
          <p className="w-fit rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-sm/6 font-semibold text-white/62 backdrop-blur-xl">
            Thèmes Grumm.
          </p>
          <h1 className="mt-5 bg-[linear-gradient(120deg,#ffffff,#ffe4a1_44%,#6ae3c0)] bg-clip-text text-[clamp(2.6rem,6vw,5.2rem)] font-extrabold leading-none text-transparent">
            Choisis une direction, laisse le fait te surprendre.
          </h1>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-white/62 sm:text-lg">
            Sciences, histoire, espace, psychologie, nature : chaque thème
            ouvre un flux dédié, pensé pour apprendre vite sans perdre le style.
          </p>
        </section>

        {isLoading ? (
          <ThemeSkeleton />
        ) : themes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => (
              <ThemeCard key={theme.id} theme={theme} />
            ))}
          </div>
        ) : (
          <div className="rounded-[22px] border border-white/10 bg-white/[0.055] p-6 text-sm font-semibold text-white/62 backdrop-blur-xl">
            Aucun thème publié pour le moment.
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
