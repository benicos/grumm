"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBadgeInfo } from "@/lib/badges";
import { getUserProfileSummary } from "@/lib/profile";
import type { UserProfileSummary } from "@/lib/profile";
import { getRoleLabel } from "@/lib/roles";
import RequireAuth from "../auth/RequireAuth";
import { AppState } from "../components/AppState";
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
    <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl">
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

      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 text-sm">
          <div>
            <p className="font-bold text-white">Prochain grade</p>
            <p className="mt-1 text-xs text-white/45">
              {badge.nextThreshold
                ? `Cap vers ${badge.nextThreshold} objectifs`
                : "Dernier palier atteint"}
            </p>
          </div>
          <span className="text-xs font-bold text-white/58">{gradeValue}</span>
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
            <Link
              key={fact.id}
              href={`/fact/${fact.slug}`}
              className="block rounded-lg border border-white/10 bg-black/16 p-4 transition hover:-translate-y-0.5 hover:border-white/20"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#ffd166]">
                  {fact.category}
                </span>
                <span className="text-xs text-white/42">{fact.source}</span>
              </div>
              <p className="text-base font-bold leading-snug tracking-[-0.03em]">
                {fact.title}
              </p>
            </Link>
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
        secondaryLabel="Retour a Decouvrir"
      />
    );
  }

  const badge = profile
    ? getBadgeInfo(profile.completedDailyGoals, profile.grades)
    : null;

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
                    <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-sm font-bold text-white/62">
                      {getRoleLabel(profile.role)}
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-bold text-[#ffd166]">
                    {badge.title}
                  </p>
                  {profile.email && (
                    <p className="mt-2 text-sm text-white/45">{profile.email}</p>
                  )}
                </div>

                <Link
                  href="/profile/edit"
                  className="rounded-md bg-[#ffd166] px-4 py-3 text-sm font-extrabold text-[#07111f] transition hover:bg-[#ffe08f]"
                >
                  Modifier le profil
                </Link>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-4">
              {[
                ["Faits aimes", profile.likedCount],
                ["Faits enregistres", profile.savedCount],
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

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <FactList
                title="Faits aimes"
                empty="Tu n'as pas encore aime de fait."
                facts={profile.likedFacts}
              />
              <FactList
                title="Faits enregistres"
                empty="Tu n'as pas encore enregistre de fait."
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
