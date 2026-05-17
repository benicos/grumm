"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getUserProfileSummary } from "@/lib/profile";
import type { UserProfileSummary } from "@/lib/profile";
import RequireAuth from "../auth/RequireAuth";
import { AppState } from "../components/AppState";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

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

function FactList({
  title,
  empty,
  facts,
}: {
  title: string;
  empty: string;
  facts: UserProfileSummary["likedFacts"];
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl">
      <h2 className="text-xl font-extrabold tracking-[-0.04em]">{title}</h2>
      <div className="mt-5 space-y-3">
        {facts.length > 0 ? (
          facts.map((fact) => (
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
      setIsLoading(true);
      setError(null);

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

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error && !isLoading) {
    return (
      <AppState
        eyebrow="Profil"
        title="Impossible de charger ton profil."
        description={error === "auth_required" ? "Connecte-toi pour consulter ton profil." : error}
        primaryHref="/login"
        primaryLabel="Se connecter"
        secondaryHref="/discover"
        secondaryLabel="Retour à Découvrir"
      />
    );
  }

  return (
    <div
      className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#050b13] text-white`}
    >
      <HeroBackground />
      <Navbar />

      <main className="relative z-10 mx-auto w-full max-w-[1180px] px-6 py-12 sm:py-16 lg:px-8">
        <section className="mb-10">
          <div className="w-fit rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-sm/6 font-semibold text-white/62 backdrop-blur-xl">
            Profil
          </div>
          <h1 className="mt-6 text-[clamp(2.4rem,6vw,5rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-white">
            {profile?.username ?? "Ton espace Velora"}
          </h1>
          {profile?.email && (
            <p className="mt-4 text-base text-white/52">
              {profile.email}
            </p>
          )}
        </section>

        {isLoading || !profile ? (
          <ProfileSkeleton />
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-4">
              {[
                {
                  label: "Faits aimes",
                  value: profile.likedCount,
                },
                {
                  label: "Faits enregistres",
                  value: profile.savedCount,
                },
                {
                  label: "Faits uniques vus",
                  value: profile.uniqueViewsCount,
                },
                {
                  label: "Objectifs realises",
                  value: profile.completedDailyGoals,
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffd166]">
                    {metric.label}
                  </p>
                  <p className="mt-4 text-4xl font-extrabold tracking-[-0.05em]">
                    {metric.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="mt-4 rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between text-xs text-white/72">
                <span className="font-semibold">Objectif du jour</span>
                <span className="font-bold text-white">
                  {profile.todayReadCount}/{profile.dailyGoal}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ffd166] to-[#6ae3c0] transition-[width] duration-500"
                  style={{
                    width: `${Math.min(
                      (profile.todayReadCount / Math.max(profile.dailyGoal, 1)) *
                        100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </section>

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
