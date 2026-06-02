"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { Bookmark, Brain, CalendarDays, Eye, Flag, Heart, Layers3, Mail, Pencil, ShieldCheck, Target, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/web";
import { getBadgeInfo } from "@/lib/badges";
import { getLearningGoalLabel } from "@/lib/learning";
import { MIN_MEMORY_FACTS } from "@/lib/memoryChallenge";
import { getUserProfileSummary } from "@/lib/profile";
import type { UserProfileSummary } from "@/lib/profile";
import { getRoleLabel } from "@/lib/roles";
import { useAuth } from "../auth/AuthProvider";
import RequireAuth from "../auth/RequireAuth";
import { AppState } from "../components/AppState";
import FactSource from "../components/FactSource";
import Footer from "../components/Footer";
import { premiumPrimaryCtaClassName } from "../components/buttonStyles";
import GradeIcon from "../components/GradeIcon";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const FACTS_PER_PAGE = 5;
const profileStatIcons = {
  completedGoals: Target,
  liked: Heart,
  saved: Bookmark,
  viewed: Eye,
};

function formatProfileDate(value: string | null) {
  if (!value) {
    return "Non disponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

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
      <div className="flex min-h-[148px] flex-col justify-between rounded-[24px] border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 text-sm">
          <div>
            <p className="flex items-center gap-2 font-bold text-white">
              <Target className="h-4 w-4 text-[#ffd166]" aria-hidden="true" />
              Progression quotidienne
            </p>
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

      <div className="flex min-h-[148px] flex-col justify-between rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 text-sm">
          <div>
            <p className="flex items-center gap-2 font-bold text-white">
              <Trophy className="h-4 w-4 text-[#ffd166]" aria-hidden="true" />
              Prochain grade
            </p>
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
  const themes = profile.topThemes.slice(0, 6);
  const maxCount = Math.max(...themes.map((theme) => theme.count), 1);
  const positions = [
    { x: 50, y: 18, size: 72 },
    { x: 23, y: 38, size: 58 },
    { x: 74, y: 42, size: 60 },
    { x: 37, y: 73, size: 50 },
    { x: 63, y: 76, size: 46 },
    { x: 50, y: 50, size: 64 },
  ];

  return (
    <section className="mt-6 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.022))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffd166]">
            <span className="inline-flex items-center gap-2">
              <Layers3 className="h-4 w-4" aria-hidden="true" />
              Carte du savoir
            </span>
          </p>
          <h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em]">
            Tes territoires les plus explorés
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/56">
            Une constellation de sujets se dessine à partir des faits que tu lis le plus.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/18 px-3 py-1 text-xs font-bold text-white/50">
          Top {themes.length}
        </span>
      </div>

      {themes.length > 0 ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <div className="relative mx-auto h-[360px] w-full max-w-[620px] rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),rgba(255,255,255,0.018)_56%,transparent_72%)]">
            <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
              {themes.slice(0, -1).map((theme, index) => {
                const current = positions[index];
                const next = positions[(index + 1) % themes.length];

                return (
                  <line
                    key={`${theme.slug}-line`}
                    x1={`${current.x}%`}
                    y1={`${current.y}%`}
                    x2={`${next.x}%`}
                    y2={`${next.y}%`}
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>
            {themes.map((theme, index) => {
              const position = positions[index];
              const size = Math.max(
                42,
                Math.round((theme.count / maxCount) * position.size),
              );

              return (
                <Link
                  key={theme.slug}
                  href={`/theme/${theme.slug}`}
                  className="absolute grid place-items-center rounded-full border border-white/15 text-center shadow-[0_18px_55px_rgba(0,0,0,0.30)] transition hover:scale-105"
                  style={{
                    background: `radial-gradient(circle, ${theme.accent} 0%, rgba(255,255,255,0.10) 72%)`,
                    height: size,
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: size,
                  }}
                  title={`${theme.name} - ${theme.count} faits lus`}
                >
                  <span className="sr-only">
                    {theme.name}, {theme.count} faits lus
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="grid gap-3">
            {themes.map((theme) => (
              <Link
                key={theme.slug}
                href={`/theme/${theme.slug}`}
                className="group flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/16 px-4 py-3 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.045]"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full shadow-[0_0_24px_currentColor]"
                  style={{ backgroundColor: theme.accent, color: theme.accent }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold text-white">
                    {theme.name}
                  </span>
                  <span className="text-xs font-semibold text-white/45">
                    {theme.count} {theme.count > 1 ? "faits" : "fait"} lus
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-white/10 bg-black/16 p-4 text-sm leading-6 text-white/62">
          Consulte quelques faits pour faire apparaître ta carte du savoir.
        </div>
      )}
    </section>
  );
}

function MemoryChallengePanel({ profile }: { profile: UserProfileSummary }) {
  const stats = profile.memoryStats;
  const isUnlocked = stats.revisableFacts >= MIN_MEMORY_FACTS;
  const lastScore =
    stats.lastScore !== null && stats.lastTotal !== null
      ? `${stats.lastScore}/${stats.lastTotal}`
      : "—";
  const average =
    stats.averageScorePercent !== null ? `${stats.averageScorePercent}%` : "—";
  const currentStreak =
    stats.currentStreakDays > 0 ? `${stats.currentStreakDays} jours` : "—";

  return (
    <section className="mt-6 overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_82%_18%,rgba(106,227,192,0.14),transparent_28%),linear-gradient(145deg,rgba(255,255,255,0.078),rgba(255,255,255,0.028))] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#6ae3c0]">
            <Brain className="h-4 w-4" aria-hidden="true" />
            Défi mémoire
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.055em] text-white sm:text-4xl">
            Révise ce que tu as déjà lu.
          </h2>
          <p className="mt-3 text-sm font-semibold leading-7 text-white/62">
            Une courte session de 3 à 5 questions, uniquement à partir des
            faits que tu as déjà découverts.
          </p>
        </div>

        <div className="grid min-w-[260px] gap-2 text-sm">
          <div className="flex items-center justify-between rounded-[16px] border border-white/10 bg-black/16 px-4 py-3">
            <span className="font-semibold text-white/50">Faits révisables</span>
            <span className="font-black text-white">{stats.revisableFacts}</span>
          </div>
          <div className="flex items-center justify-between rounded-[16px] border border-white/10 bg-black/16 px-4 py-3">
            <span className="font-semibold text-white/50">Dernier score</span>
            <span className="font-black text-white">{lastScore}</span>
          </div>
          <div className="flex items-center justify-between rounded-[16px] border border-white/10 bg-black/16 px-4 py-3">
            <span className="font-semibold text-white/50">Moyenne</span>
            <span className="font-black text-white">{average}</span>
          </div>
          <div className="flex items-center justify-between rounded-[16px] border border-white/10 bg-black/16 px-4 py-3">
            <span className="font-semibold text-white/50">Série actuelle</span>
            <span className="font-black text-white">{currentStreak}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isUnlocked ? (
          <p className="text-sm font-semibold text-white/56">
            {stats.challengesCompleted > 0
              ? `${stats.challengesCompleted} défi${
                  stats.challengesCompleted > 1 ? "s" : ""
                } terminé${stats.challengesCompleted > 1 ? "s" : ""}.`
              : "Ton premier défi est prêt."}{" "}
            {stats.bestStreakDays > 0
              ? `Meilleure série : ${stats.bestStreakDays} jours.`
              : ""}
          </p>
        ) : (
          <p className="text-sm font-semibold text-white/56">
            Lis encore quelques faits pour débloquer ton premier défi mémoire.
          </p>
        )}

        <Link
          href={isUnlocked ? "/profil/defi-memoire" : "/decouvrir"}
          className={
            isUnlocked
              ? `${premiumPrimaryCtaClassName} justify-center`
              : "inline-flex justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-black text-white/70 transition hover:border-white/24 hover:text-white"
          }
        >
          {isUnlocked ? "Lancer le défi" : "Lire quelques faits"}
        </Link>
      </div>
    </section>
  );
}

function QuickAccessPanel() {
  return (
    <section className="mt-6 grid gap-3 md:grid-cols-3">
      <Link
        href="/decouvrir"
        className="rounded-[24px] border border-white/10 bg-white/[0.055] p-5 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08]"
      >
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffd166]">
          Découvrir
        </p>
        <h2 className="mt-3 text-xl font-extrabold tracking-[-0.04em]">
          Continuer le flux
        </h2>
      </Link>
      <Link
        href="/profil/defi-memoire"
        className="rounded-[24px] border border-white/10 bg-white/[0.055] p-5 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08]"
      >
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#6ae3c0]">
          Mémoire
        </p>
        <h2 className="mt-3 text-xl font-extrabold tracking-[-0.04em]">
          Réviser mes faits
        </h2>
      </Link>
      <Link
        href="/explorer"
        className="rounded-[24px] border border-white/10 bg-white/[0.055] p-5 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08]"
      >
        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
          Explorer
        </p>
        <h2 className="mt-3 text-xl font-extrabold tracking-[-0.04em]">
          Chercher un sujet
        </h2>
      </Link>
    </section>
  );
}

function SuccessPanel({ profile }: { profile: UserProfileSummary }) {
  const successes = [
    {
      label: "Mémoire",
      value:
        profile.memoryStats.bestStreakDays > 0
          ? `${profile.memoryStats.bestStreakDays} jours de série`
          : "Premier défi à lancer",
    },
    {
      label: "Bibliothèque",
      value: `${profile.savedCount} fait${profile.savedCount > 1 ? "s" : ""} enregistré${
        profile.savedCount > 1 ? "s" : ""
      }`,
    },
    {
      label: "Découverte",
      value: `${profile.uniqueViewsCount} fait${profile.uniqueViewsCount > 1 ? "s" : ""} découvert${
        profile.uniqueViewsCount > 1 ? "s" : ""
      }`,
    },
  ];

  return (
    <section className="mt-6 rounded-[28px] border border-white/10 bg-black/18 p-5">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
        Réussites récentes
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {successes.map((success) => (
          <div
            key={success.label}
            className="rounded-[20px] border border-white/10 bg-white/[0.045] p-4"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
              {success.label}
            </p>
            <p className="mt-2 text-lg font-extrabold tracking-[-0.03em] text-white">
              {success.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProfileStatCard({
  label,
  type,
  value,
}: {
  label: string;
  type: keyof typeof profileStatIcons;
  value: number;
}) {
  const Icon = profileStatIcons[type];

  return (
    <div className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.082),rgba(255,255,255,0.032))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[#ffd166]/10 blur-2xl transition group-hover:bg-[#6ae3c0]/12" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-[16px] border border-[#ffd166]/20 bg-[#ffd166]/10 text-[#ffd166]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-4xl font-extrabold tracking-[-0.05em]">
          {value}
        </p>
      </div>
      <p className="relative mt-5 text-xs font-bold uppercase tracking-[0.18em] text-white/52">
        {label}
      </p>
    </div>
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
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="absolute -right-12 -top-14 h-32 w-32 rounded-full bg-[#6ae3c0]/10 blur-2xl" />
      <div className="relative flex items-center justify-between gap-4">
        <h2 className="text-2xl font-extrabold tracking-[-0.04em]">{title}</h2>
        <span className="rounded-full bg-white/[0.07] px-3 py-1 text-xs font-bold text-white/48">
          {facts.length} total
        </span>
      </div>
      <div className="relative mt-5 divide-y divide-white/10">
        {visibleFacts.length > 0 ? (
          visibleFacts.map((fact) => (
            <article
              key={fact.id}
              className="group py-4 transition hover:translate-x-1"
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
              <Link href={`/fait/${fact.slug}`} className="block">
                <p className="text-base font-bold leading-snug tracking-[-0.03em] transition group-hover:text-[#ffe2a3]">
                  {fact.title}
                </p>
                {fact.hook ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/52">
                    {fact.hook}
                  </p>
                ) : null}
              </Link>
            </article>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-white/12 bg-black/14 p-5 text-sm leading-6 text-white/62">
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
              Précédent
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
    void trackAnalyticsEvent({ eventName: "profile_opened" });
  }, []);

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
        secondaryHref="/decouvrir"
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

            <div className="-mt-3 mb-4 flex justify-end">
              <Link
                href="/profil/edit"
                className={`${premiumPrimaryCtaClassName} shadow-[0_18px_65px_rgba(255,209,102,0.20)]`}
              >
                <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                Modifier le profil
              </Link>
            </div>
            <section className="mb-8 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-5 shadow-[0_30px_110px_rgba(0,0,0,0.26)] backdrop-blur-2xl sm:p-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h1 className="text-[clamp(2.5rem,6vw,4.8rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-white">
                    {profile.username ?? "Profil"}
                  </h1>
                  {profile.email && (
                    <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-white/48">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      {profile.email}
                    </p>
                  )}
                  <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-white/66">
                    {profile.uniqueViewsCount} connaissance
                    {profile.uniqueViewsCount > 1 ? "s" : ""} découverte
                    {profile.uniqueViewsCount > 1 ? "s" : ""}. Ta bibliothèque
                    commence à prendre forme.
                  </p>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 rounded-[22px] border border-[#ffd166]/18 bg-[#ffd166]/10 px-4 py-3 text-[#ffe2a3] lg:min-w-[240px]">
                  <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-black/20 text-[#ffd166]">
                    <GradeIcon
                      badge={gradeBadge}
                      className="h-7 w-7 text-[#ffd166]"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffd166]/70">
                      Rang
                    </p>
                    <p className="truncate text-lg font-extrabold text-white">
                      {gradeTitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/14 p-4">
                  <CalendarDays className="h-5 w-5 text-[#ffd166]" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
                      Inscription
                    </p>
                    <p className="mt-1 font-extrabold text-white">
                      {formatProfileDate(profile.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/14 p-4">
                  <ShieldCheck className="h-5 w-5 text-[#6ae3c0]" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
                      Rôle
                    </p>
                    <p className="mt-1 font-extrabold text-white">
                      {getRoleLabel(profile.role)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/14 p-4">
                  <Flag className="h-5 w-5 text-[#ffd166]" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
                      Objectif quotidien
                    </p>
                    <p className="mt-1 font-extrabold text-white">
                      {profile.dailyGoal} faits
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/14 p-4">
                  <Layers3 className="h-5 w-5 text-[#f4ead5]" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/38">
                      Objectif culturel
                    </p>
                    <p className="mt-1 font-extrabold text-white">
                      {getLearningGoalLabel(profile.learningGoal)}
                    </p>
                  </div>
                </div>
              </div>

            </section>

            <ProgressPanel profile={profile} />
            <MemoryChallengePanel profile={profile} />
            <ThemeInsightsPanel profile={profile} />
            <QuickAccessPanel />
            <SuccessPanel profile={profile} />
          </>
        )}
      </main>
      <Footer />
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
