"use client";

import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import {
  BookMarked,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  Compass,
  Flame,
  Info,
  Layers3,
  Mail,
  Pencil,
  Play,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { trackAnalyticsEvent, trackAnalyticsEventOnce } from "@/lib/analytics/web";
import { getBadgeInfo } from "@/lib/badges";
import { MIN_MEMORY_FACTS } from "@/lib/memoryChallenge";
import { getUserProfileSummary } from "@/lib/profile";
import type { UserProfileSummary } from "@/lib/profile";
import { useAuth } from "../auth/AuthProvider";
import RequireAuth from "../auth/RequireAuth";
import { AppState } from "../components/AppState";
import Footer from "../components/Footer";
import { premiumPrimaryCtaClassName } from "../components/buttonStyles";
import HeroBackground from "../components/HeroBackground";
import Navbar from "../components/Navbar";
import ThemeIcon from "../components/ThemeIcon";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

function ProfileSkeleton() {
  return (
    <div className="grid gap-5">
      <div className="rounded-[34px] border border-white/10 bg-white/[0.055] p-5">
        <div className="flex items-center gap-5">
          <div className="h-28 w-28 animate-pulse rounded-[30px] bg-white/10" />
          <div className="flex-1">
            <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
            <div className="mt-4 h-9 w-44 animate-pulse rounded-full bg-white/10" />
            <div className="mt-5 h-2 w-full animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[22px] border border-white/10 bg-white/[0.045] p-4"
          >
            <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="mt-4 h-7 w-16 animate-pulse rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

function getGradeSnapshot(profile: UserProfileSummary) {
  const orderedGrades = [...profile.grades].sort(
    (a, b) =>
      a.requiredGoals - b.requiredGoals ||
      (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
  );
  const currentIndex = orderedGrades.reduce(
    (activeIndex, grade, index) =>
      profile.completedDailyGoals >= grade.requiredGoals ? index : activeIndex,
    0,
  );
  const currentGrade = orderedGrades[currentIndex] ?? orderedGrades[0];
  const nextGrade = orderedGrades[currentIndex + 1] ?? null;

  return {
    currentGrade,
    nextGrade,
    rank: currentIndex + 1,
    remainingGoals: nextGrade
      ? Math.max(nextGrade.requiredGoals - profile.completedDailyGoals, 0)
      : 0,
  };
}

function gradeAvatarSrc(rank: number) {
  return `/avatar/avatar_rank_${Math.max(rank, 1)}.png`;
}

function getDailyProgressClassName(
  status: UserProfileSummary["weeklyDailyProgress"][number]["status"],
) {
  if (status === "completed") {
    return "border-[#6ae3c0]/42 bg-[#6ae3c0]/18 text-[#b8fff0]";
  }

  if (status === "current") {
    return "border-[#ffd166]/45 bg-[#ffd166]/14 text-[#ffe2a3]";
  }

  if (status === "missed") {
    return "border-white/10 bg-black/20 text-white/34";
  }

  return "border-white/10 bg-white/[0.035] text-white/42";
}

function ProfileHeaderSignals({
  hasNextGrade,
  nextGradeTitle,
  profile,
  remainingGoals,
}: {
  hasNextGrade: boolean;
  nextGradeTitle: string;
  profile: UserProfileSummary;
  remainingGoals: number;
}) {
  const remainingLabel = hasNextGrade
    ? `${remainingGoals} objectif${remainingGoals > 1 ? "s" : ""} restant${remainingGoals > 1 ? "s" : ""}`
    : "Tous les grades sont débloqués";

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.86fr)_minmax(260px,1fr)] xl:items-end">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#6ae3c0]">
            <Target className="h-3.5 w-3.5" aria-hidden="true" />
            Avancement
          </p>
          <p className="mt-1 text-sm font-black leading-5 text-white">
            <span className="text-white/52">Prochain grade :</span>{" "}
            <span className="text-[#6ae3c0]">{nextGradeTitle}</span>
          </p>
          <p className="mt-1 text-xs font-bold leading-5 text-white/48">
            {remainingLabel}
          </p>
        </div>

        <hr className="border-white/10 xl:hidden" />

        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#ffb45f]">
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {profile.currentStreakDays} jour{profile.currentStreakDays > 1 ? "s" : ""} consécutif{profile.currentStreakDays > 1 ? "s" : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {profile.weeklyDailyProgress.map((day) => (
              <span
                key={day.date}
                className={`grid h-7 w-7 place-items-center rounded-full border text-[10px] font-black sm:h-6 sm:w-6 sm:text-[9px] ${getDailyProgressClassName(day.status)}`}
                title={`${day.label} - ${day.readCount}/${day.goal} faits`}
              >
                {day.status === "completed" ? (
                  <Check className="h-3.5 w-3.5 sm:h-3 sm:w-3" aria-hidden="true" />
                ) : (
                  day.label
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
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
                  <span
                    className="absolute inset-1 rounded-full border border-white/10 bg-black/18 backdrop-blur-[2px]"
                    aria-hidden="true"
                  />
                  <ThemeIcon
                    iconName={theme.themeIcon}
                    className="relative h-[42%] w-[42%] drop-shadow-[0_10px_18px_rgba(0,0,0,0.38)]"
                    style={{ color: "#ffffff" }}
                  />
                  <span className="sr-only">
                    {theme.name}, {theme.count} faits lus
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {themes.slice(0, 4).map((theme) => (
              <Link
                key={`${theme.slug}-compact`}
                href={`/theme/${theme.slug}`}
                className="inline-flex min-w-max items-center gap-2 rounded-full border border-white/10 bg-black/18 px-3 py-2 text-xs font-extrabold text-white/70"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: theme.accent }}
                />
                {theme.name}
                <span className="text-white/38">{theme.count}</span>
              </Link>
            ))}
            {themes.length > 4 ? (
              <span className="inline-flex min-w-max items-center rounded-full border border-white/10 bg-black/18 px-3 py-2 text-xs font-extrabold text-white/45">
                +{themes.length - 4}
              </span>
            ) : null}
          </div>

          <div className="hidden gap-3 lg:grid">
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
  const bestSignal =
    stats.averageScorePercent !== null
      ? `${stats.averageScorePercent}% moyen`
      : `${stats.revisableFacts} faits prêts`;

  return (
    <section className="mt-6 overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_84%_12%,rgba(106,227,192,0.22),transparent_28%),radial-gradient(circle_at_12%_84%,rgba(167,139,250,0.18),transparent_30%),linear-gradient(145deg,rgba(255,255,255,0.082),rgba(255,255,255,0.028))] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <div className="relative grid h-24 w-24 place-items-center rounded-[28px] border border-[#6ae3c0]/20 bg-[#6ae3c0]/10 text-[#6ae3c0] shadow-[0_0_70px_rgba(106,227,192,0.14)]">
          <Brain className="h-12 w-12" aria-hidden="true" />
          <span className="absolute -right-2 -top-2 grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-black/35 text-[#ffd166] backdrop-blur-xl">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#6ae3c0]">
            <Brain className="h-4 w-4" aria-hidden="true" />
            Défi mémoire
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.055em] text-white sm:text-4xl">
            Révise ce que tu as déjà lu.
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/62">
            Une session courte, personnalisée, construite à partir de tes faits lus.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-3 py-1.5 text-xs font-black text-white/68">
              <BookMarked className="h-3.5 w-3.5 text-[#6ae3c0]" aria-hidden="true" />
              {stats.revisableFacts} faits révisables
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-3 py-1.5 text-xs font-black text-white/68">
              <Target className="h-3.5 w-3.5 text-[#a78bfa]" aria-hidden="true" />
              {bestSignal}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:min-w-[210px]">
          <Link
            href={isUnlocked ? "/quiz/memoire" : "/decouvrir"}
            className={
              isUnlocked
                ? `${premiumPrimaryCtaClassName} justify-center`
                : "inline-flex justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-black text-white/70 transition hover:border-white/24 hover:text-white"
            }
          >
            {isUnlocked ? (
              <>
                <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                Lancer le défi
              </>
            ) : (
              "Lire quelques faits"
            )}
          </Link>
          <p className="text-center text-xs font-semibold leading-5 text-white/45 lg:text-left">
            {isUnlocked
              ? stats.challengesCompleted > 0
                ? `${stats.challengesCompleted} défi${stats.challengesCompleted > 1 ? "s" : ""} terminé${stats.challengesCompleted > 1 ? "s" : ""}.`
                : "Ton premier défi est prêt."
              : `Encore ${Math.max(MIN_MEMORY_FACTS - stats.revisableFacts, 0)} faits à lire pour le débloquer.`}
          </p>
        </div>
      </div>
    </section>
  );
}

function QuickAccessPanel() {
  const quickAccessItems: {
    accent: string;
    accentSoft: string;
    href: string;
    icon: LucideIcon;
    label: string;
    title: string;
  }[] = [
    {
      accent: "#6ae3c0",
      accentSoft: "rgba(106,227,192,0.13)",
      href: "/decouvrir",
      icon: Sparkles,
      label: "Découvrir",
      title: "Continuer le flux",
    },
    {
      accent: "#a78bfa",
      accentSoft: "rgba(167,139,250,0.13)",
      href: "/quiz/memoire",
      icon: Brain,
      label: "Défi mémoire",
      title: "Réviser mes faits",
    },
    {
      accent: "#ffb45f",
      accentSoft: "rgba(255,180,95,0.13)",
      href: "/theme",
      icon: Compass,
      label: "Explorer",
      title: "Chercher un sujet",
    },
  ];

  return (
    <section className="mt-6 grid gap-3 md:grid-cols-3">
      {quickAccessItems.map(
        ({ accent, accentSoft, href, icon: Icon, label, title }) => (
        <Link
          key={href}
          href={href}
          className="group rounded-[24px] border border-white/10 bg-white/[0.055] p-5 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.08]"
          style={{
            backgroundImage: `radial-gradient(circle at 88% 12%, ${accent}18, transparent 34%)`,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl border shadow-[0_16px_46px_rgba(0,0,0,0.18)]"
              style={{
                backgroundColor: accentSoft,
                borderColor: `${accent}36`,
                color: accent,
              }}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <ChevronRight
              className="h-4 w-4 text-white/34 transition group-hover:translate-x-0.5 group-hover:text-white/70"
              aria-hidden="true"
            />
          </div>
          <p
            className="mt-5 text-xs font-black uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            {label}
          </p>
          <h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em]">
            {title}
          </h2>
        </Link>
        ),
      )}
    </section>
  );
}

function SavedFactsPanel({ profile }: { profile: UserProfileSummary }) {
  const savedFacts = profile.savedFacts.slice(0, 3);
  const hasFewSavedFacts = savedFacts.length < 3;

  return (
    <section
      id="bibliotheque-personnelle"
      className="mt-6 scroll-mt-28 overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_92%_8%,rgba(244,234,213,0.14),transparent_28%),linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.022))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#f4ead5]">
            <BookMarked className="h-4 w-4" aria-hidden="true" />
            Bibliothèque
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.045em] text-white sm:text-3xl">
            Bibliothèque personnelle
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/56">
            Les idées que tu gardes pour plus tard.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/18 px-3 py-1.5 text-xs font-black text-white/52">
          {profile.savedCount} fait{profile.savedCount > 1 ? "s" : ""}
        </span>
      </div>

      {savedFacts.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {savedFacts.map((fact) => (
            <Link
              key={fact.id}
              href={`/fait/${fact.slug}`}
              className="group relative min-h-[172px] overflow-hidden rounded-[22px] border border-white/10 bg-black/16 p-4 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.045]"
            >
              <span
                className="absolute -right-10 -top-12 h-28 w-28 rounded-full opacity-25 blur-3xl transition group-hover:scale-110"
                style={{ backgroundColor: fact.accent }}
                aria-hidden="true"
              />
              <div className="relative flex items-start justify-between gap-3">
                <p
                  className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]"
                  style={{
                    backgroundColor: `${fact.accent}14`,
                    borderColor: `${fact.accent}34`,
                    color: fact.accent,
                  }}
                >
                  {fact.category}
                </p>
                <BookMarked className="h-4 w-4 shrink-0 text-white/32" aria-hidden="true" />
              </div>
              <h3 className="relative mt-4 line-clamp-2 text-base font-extrabold leading-5 text-white">
                {fact.title}
              </h3>
              {fact.hook ? (
                <p className="relative mt-3 line-clamp-2 text-xs font-semibold leading-5 text-white/48">
                  {fact.hook}
                </p>
              ) : null}
              <span className="relative mt-5 inline-flex items-center text-xs font-black text-[#f4ead5]">
                Relire
                <ChevronRight className="ml-1 h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {hasFewSavedFacts ? (
        <div className={`${savedFacts.length > 0 ? "mt-3" : "mt-5"} rounded-[22px] border border-dashed border-white/14 bg-black/14 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4`}>
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#f4ead5]/18 bg-[#f4ead5]/10 text-[#f4ead5]">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black text-white">
                {savedFacts.length > 0
                  ? "Ta bibliothèque commence à prendre forme."
                  : "Ta bibliothèque est prête à accueillir ses premiers faits."}
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/48">
                Sauvegarde ce qui mérite d&apos;être relu, cité ou partagé plus tard.
              </p>
            </div>
          </div>
          <Link
            href="/decouvrir"
            className="mt-4 inline-flex rounded-full border border-white/12 px-4 py-2 text-xs font-black text-white/70 transition hover:border-white/24 hover:text-white sm:mt-0"
          >
            Découvrir d&apos;autres faits
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function ProfileStatsPanel({ profile }: { profile: UserProfileSummary }) {
  const stats: {
    action?: "library";
    accent: string;
    accentSoft: string;
    icon: LucideIcon;
    label: string;
    value: string;
  }[] = [
    {
      accent: "#6ae3c0",
      accentSoft: "rgba(106,227,192,0.12)",
      icon: BookOpen,
      label: "Faits lus",
      value: String(profile.uniqueViewsCount),
    },
    {
      accent: "#ffd166",
      accentSoft: "rgba(255,209,102,0.12)",
      action: "library",
      icon: BookMarked,
      label: "Enregistrés",
      value: String(profile.savedCount),
    },
    {
      accent: "#ff9f43",
      accentSoft: "rgba(255,159,67,0.12)",
      icon: Flame,
      label: "Meilleure série",
      value: String(profile.bestDailyStreakDays),
    },
    {
      accent: "#a78bfa",
      accentSoft: "rgba(167,139,250,0.12)",
      icon: Brain,
      label: "Quiz parfaits",
      value: String(profile.perfectQuizCount),
    },
  ];

  function scrollToLibrary() {
    document
      .getElementById("bibliotheque-personnelle")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const content = (
          <>
            <div className="flex items-center justify-between gap-3">
              <span
                className="grid h-10 w-10 place-items-center rounded-2xl border"
                style={{
                  backgroundColor: stat.accentSoft,
                  borderColor: `${stat.accent}36`,
                  color: stat.accent,
                }}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-2xl font-black tracking-[-0.05em] text-white">
                {stat.value}
              </span>
            </div>
            <p
              className="mt-4 text-[11px] font-black uppercase tracking-[0.16em]"
              style={{ color: stat.accent }}
            >
              {stat.label}
            </p>
          </>
        );

        if (stat.action === "library") {
          return (
            <button
              key={stat.label}
              type="button"
              onClick={scrollToLibrary}
              className="rounded-[22px] border border-white/10 bg-black/16 p-4 text-left shadow-[0_18px_55px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:border-[#ffd166]/28 hover:bg-white/[0.045]"
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={stat.label}
            className="rounded-[22px] border border-white/10 bg-black/16 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.12)]"
          >
            {content}
          </div>
        );
      })}
    </section>
  );
}


function ProfileContent() {
  const { profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);

  useEffect(() => {
    void trackAnalyticsEvent({ eventName: "profile_opened" });
    void trackAnalyticsEventOnce("avatar_viewed", { eventName: "avatar_viewed" });
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const currentGrade = [...profile.grades]
      .sort((a, b) => b.requiredGoals - a.requiredGoals)
      .find((grade) => profile.completedDailyGoals >= grade.requiredGoals);

    if (!currentGrade) {
      return;
    }

    void trackAnalyticsEventOnce(`grade_up:${currentGrade.slug}`, {
      entityId: currentGrade.id,
      entityType: "grade",
      eventName: "grade_up",
      metadata: {
        completed_daily_goals: profile.completedDailyGoals,
        grade_slug: currentGrade.slug,
      },
    });
  }, [profile]);

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
        title="Profil en synchronisation."
        description={
          error === "auth_required"
            ? "Connecte-toi pour retrouver ta progression."
            : "Tes données seront disponibles dans un instant."
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
  const gradeTitle = authProfile?.gradeName ?? badge?.title ?? null;
  const gradeRank = profile
    ? [...profile.grades]
        .sort(
          (a, b) =>
            a.requiredGoals - b.requiredGoals ||
            (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
        )
        .reduce(
          (activeRank, grade, index) =>
            profile.completedDailyGoals >= grade.requiredGoals
              ? index + 1
              : activeRank,
          1,
        )
    : 1;
  const gradeSnapshot = profile ? getGradeSnapshot(profile) : null;
  const activeGradeTitle =
    gradeSnapshot?.currentGrade?.name ?? gradeTitle ?? "Curieux";
  const nextGradeTitle = gradeSnapshot?.nextGrade?.name ?? "Dernier rang";
  const hasNextGrade = Boolean(gradeSnapshot?.nextGrade);
  const activeGradeRank = gradeSnapshot?.rank ?? gradeRank;
  const remainingGradeGoals = gradeSnapshot?.remainingGoals ?? 0;
  const avatarSrc = gradeAvatarSrc(activeGradeRank);

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

            <section className="mb-7 rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_86%_10%,rgba(255,209,102,0.18),transparent_30%),radial-gradient(circle_at_10%_80%,rgba(106,227,192,0.14),transparent_32%),linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.024))] p-5 shadow-[0_32px_110px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start lg:items-center">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[28px] border-[4px] border-[#ffd166]/38 bg-white/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_28px_90px_rgba(0,0,0,0.36),0_0_78px_rgba(255,209,102,0.22)] sm:h-[136px] sm:w-[136px] sm:rounded-[36px]">
                    {/* Les avatars sont liés au rang, pas modifiables par l'utilisateur. */}
                    <Image
                      alt="Avatar de rang Grumm"
                      height={136}
                      src={avatarSrc}
                      width={136}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = "/avatar/avatar.png";
                      }}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 sm:max-w-[760px]">
                    <h1 className="truncate text-[clamp(2rem,6vw,3.25rem)] font-black leading-none tracking-[-0.055em] text-white">
                      {profile.username ?? "Profil"}
                    </h1>
                    <button
                      type="button"
                      onClick={() => setIsGradeModalOpen(true)}
                      className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[#ffd166]/18 bg-[#ffd166]/10 px-3 py-1.5 text-left text-sm font-black text-[#ffe2a3] transition hover:border-[#ffd166]/32 hover:bg-[#ffd166]/14"
                    >
                      {activeGradeTitle}
                      <Info className="h-4 w-4 shrink-0 text-[#ffd166]/70" aria-hidden="true" />
                    </button>
                    {profile.email ? (
                      <p className="mt-2 flex min-w-0 items-center gap-2 text-xs font-semibold text-white/38">
                        <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{profile.email}</span>
                      </p>
                    ) : null}
                    <ProfileHeaderSignals
                      hasNextGrade={hasNextGrade}
                      nextGradeTitle={nextGradeTitle}
                      profile={profile}
                      remainingGoals={remainingGradeGoals}
                    />
                  </div>
                </div>

                <Link
                  href="/profil/edit"
                  className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-black text-white/70 transition hover:border-white/24 hover:text-white"
                >
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  Modifier
                </Link>
              </div>
            </section>

            <ProfileStatsPanel profile={profile} />

            {isGradeModalOpen ? (
              <div
                aria-modal="true"
                className="fixed inset-0 z-[80] grid place-items-end bg-black/62 px-4 py-5 backdrop-blur-sm sm:place-items-center"
                role="dialog"
              >
                <button
                  type="button"
                  aria-label="Fermer"
                  className="absolute inset-0 cursor-default"
                  onClick={() => setIsGradeModalOpen(false)}
                />
                <div className="grade-modal relative w-full max-w-md rounded-[28px] border border-white/10 bg-[#07111f]/88 p-5 shadow-[0_28px_90px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
                  <button
                    type="button"
                    aria-label="Fermer l'explication du rang"
                    className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/24 text-white/62 transition hover:border-white/20 hover:text-white"
                    onClick={() => setIsGradeModalOpen(false)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-[#ffd166]/24 bg-[#ffd166]/12 text-[#ffd166]">
                    <Info className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#ffd166]">
                    Rang actuel
                  </p>
                  <h2 className="mt-2 pr-12 text-2xl font-black tracking-[-0.045em] text-white">
                    {activeGradeTitle}
                  </h2>
                  <p className="mt-3 text-sm font-semibold leading-6 text-white/64">
                    Ton rang reflète ta progression sur Grumm. Il évolue quand
                    tu atteins ton objectif quotidien et construis une vraie
                    routine de découverte.
                  </p>
                </div>
              </div>
            ) : null}
            <MemoryChallengePanel profile={profile} />
            <SavedFactsPanel profile={profile} />
            <ThemeInsightsPanel profile={profile} />
            <QuickAccessPanel />
          </>
        )}
      </main>
      <Footer />
      <style jsx>{`
        .grade-modal {
          animation: gradeModalEnter 180ms ease-out both;
        }

        @keyframes gradeModalEnter {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .grade-modal {
            animation: none;
          }
        }
      `}</style>
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
