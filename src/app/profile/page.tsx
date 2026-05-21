"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBadgeInfo } from "@/lib/badges";
import { getUserProfileSummary } from "@/lib/profile";
import type { UserProfileSummary } from "@/lib/profile";
import { getRoleLabel } from "@/lib/roles";
import { useAuth } from "../auth/AuthProvider";
import RequireAuth from "../auth/RequireAuth";
import { AppState } from "../components/AppState";
import FactSource from "../components/FactSource";
import { premiumPrimaryCtaClassName } from "../components/buttonStyles";
import GradeIcon from "../components/GradeIcon";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const FACTS_PER_PAGE = 5;

function ProfileSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-lg border border-white/10 bg-white/[0.055] p-5"
        >
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="mt-5 h-10 w-20 animate-pulse rounded-full bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function ProgressPanel({ profile }: { profile: UserProfileSummary }) {
  const badge = getBadgeInfo(profile.completedDailyGoals, profile.grades);
  const nextThreshold = badge.nextThreshold ?? badge.currentThreshold;
  const gradeValue = badge.nextThreshold
    ? `${profile.completedDailyGoals} / ${badge.nextThreshold} objectifs atteints`
    : `${profile.completedDailyGoals} objectifs atteints`;

  return (
    <section className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="flex min-h-[148px] flex-col justify-between rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 text-sm">
          <div>
            <p className="font-bold text-white">Progression quotidienne</p>
            <p className="mt-1 text-xs text-white/45">
              Faits uniques vus aujourd&apos;hui
            </p>
          </div>
          <span className="font-extrabold text-white">
            {profile.todayReadCount}/{profile.dailyGoal}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ffd166] to-[#6ae3c0]"
            style={{
              width: `${Math.min(
                (profile.todayReadCount / Math.max(profile.dailyGoal, 1)) * 100,
                100,
              )}%`,
            }}
          />
        </div>
      </div>

      <div className="flex min-h-[148px] flex-col justify-between rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 text-sm">
          <div>
            <p className="font-bold text-white">Prochain grade</p>
            <p className="mt-1 text-xs text-white/45">
              {badge.nextThreshold
                ? `Cap vers ${badge.nextThreshold} objectifs`
                : "Dernier palier atteint"}
            </p>
          </div>
          <span className="max-w-[160px] text-right text-xs font-bold leading-5 text-white/58">
            {gradeValue}
          </span>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white/50"
            style={{
              width: `${Math.min(
                badge.nextThreshold
                  ? (profile.completedDailyGoals / Math.max(nextThreshold, 1)) *
                      100
                  : 100,
                100,
              )}%`,
            }}
          />
        </div>
      </div>
    </section>
  );
}

function ThemeInsightsPanel({ profile }: { profile: UserProfileSummary }) {
  return (
    <section className="mt-6 rounded-lg border border-white/10 bg-white/[0.05] p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffd166]">
            Thèmes vus
          </p>
          <h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em]">
            Tes thèmes les plus consultés
          </h2>
        </div>
        <span className="rounded-full border border-white/10 bg-black/18 px-3 py-1 text-xs font-bold text-white/50">
          Top {Math.max(profile.topThemes.length, 0)}
        </span>
      </div>

      {profile.topThemes.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {profile.topThemes.map((theme) => (
            <Link
              key={theme.slug}
              href={`/discover/theme/${theme.slug}`}
              className="group grid gap-2 rounded-md border border-white/10 bg-black/16 p-3 transition hover:border-white/20"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold text-white">{theme.name}</span>
                <span className="text-xs font-bold text-white/45">
                  {theme.count} vue{theme.count > 1 ? "s" : ""}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    backgroundColor: theme.accent,
                    width: `${theme.percent}%`,
                  }}
                />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-white/10 bg-black/16 p-4 text-sm leading-6 text-white/62">
          Consulte quelques faits pour faire apparaître tes thèmes favoris.
        </div>
      )}
    </section>
  );
}

function FactList({
  empty,
  facts,
  title,
}: {
  empty: string;
  facts: UserProfileSummary["likedFacts"];
  title: string;
}) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(facts.length / FACTS_PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const visibleFacts = facts.slice(
    (safePage - 1) * FACTS_PER_PAGE,
    safePage * FACTS_PER_PAGE,
  );

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold tracking-[-0.04em]">{title}</h2>
        <span className="text-xs font-bold text-white/42">
          {facts.length} total
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {visibleFacts.length > 0 ? (
          visibleFacts.map((fact) => (
            <article
              key={fact.id}
              className="rounded-lg border border-white/10 bg-black/16 p-4 transition hover:-translate-y-0.5 hover:border-white/20"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
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
                <p className="text-base font-bold leading-snug tracking-[-0.03em]">
                  {fact.title}
                </p>
              </Link>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-white/10 bg-black/16 p-4 text-sm leading-6 text-white/62">
            {empty}
          </div>
        )}
      </div>

      {facts.length > FACTS_PER_PAGE && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-white/58">
          <span>
            Page {safePage}/{pageCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-md border border-white/10 px-3 py-2 font-bold transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Precedent
            </button>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() =>
                setPage((current) => Math.min(current + 1, pageCount))
              }
              className="rounded-md border border-white/10 px-3 py-2 font-bold transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ProfileContent() {
  const { profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const summary = await getUserProfileSummary();

        if (isMounted) {
          setProfile(summary);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Le profil est indisponible.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error && !isLoading) {
    return (
      <AppState
        eyebrow="Profil"
        title="Impossible de charger ton profil."
        description={
          error === "auth_required"
            ? "Connecte-toi pour consulter ton profil."
            : error
        }
        primaryHref="/login"
        primaryLabel="Se connecter"
        secondaryHref="/discover"
        secondaryLabel="Retour à Découvrir"
      />
    );
  }

  const badge = profile
    ? getBadgeInfo(profile.completedDailyGoals, profile.grades)
    : null;
  const gradeBadge = authProfile?.gradeBadge ?? badge?.badge ?? null;
  const gradeTitle = authProfile?.gradeName ?? badge?.title ?? null;

  return (
    <div
      className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#132338] text-white`}
    >
      <HeroBackground />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-[1180px] px-6 py-12 sm:py-16 lg:px-8">
        {isLoading || !profile || !badge ? (
          <ProfileSkeleton />
        ) : (
          <>
            <section className="mb-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-white">
                      {profile.username ?? "Profil"}
                    </h1>
                    <span
                      className="inline-flex shrink-0 text-[#ffd166]"
                      title={gradeTitle ?? undefined}
                    >
                      <GradeIcon
                        badge={gradeBadge}
                        className="h-7 w-7 text-[#ffd166]"
                      />
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-sm font-bold text-white/62">
                      {getRoleLabel(profile.role)}
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-bold text-[#ffd166]">
                    {gradeTitle}
                  </p>
                  {profile.email && (
                    <p className="mt-2 text-sm text-white/45">{profile.email}</p>
                  )}
                </div>

                <Link
                  href="/profile/edit"
                  className={premiumPrimaryCtaClassName}
                >
                  Modifier le profil
                </Link>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-4">
              {[
                ["Faits aimes", profile.likedCount],
                ["Faits enregistrés", profile.savedCount],
                ["Faits uniques vus", profile.uniqueViewsCount],
                ["Objectifs realises", profile.completedDailyGoals],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffd166]">
                    {label}
                  </p>
                  <p className="mt-4 text-4xl font-extrabold tracking-[-0.05em]">
                    {value}
                  </p>
                </div>
              ))}
            </section>

            <ProgressPanel profile={profile} />
            <ThemeInsightsPanel profile={profile} />

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <FactList
                title="Faits aimes"
                empty="Tu n'as pas encore aime de fait."
                facts={profile.likedFacts}
              />
              <FactList
                title="Faits enregistrés"
                empty="Tu n'as pas encore enregistré de fait."
                facts={profile.savedFacts}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}
