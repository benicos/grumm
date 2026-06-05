"use client";

import { Brain, Flame, Target, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { getUserQuizStats, type UserQuizStats } from "@/lib/quizStats";
import { useAuth } from "../auth/AuthProvider";

type QuizStatItem = {
  accent: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

function buildStatItems(stats: UserQuizStats): QuizStatItem[] {
  return [
    {
      accent: "#a78bfa",
      icon: Trophy,
      label: "Meilleur score",
      value:
        stats.bestScorePercent === null
          ? "Aucun score"
          : `${stats.bestScorePercent}%`,
    },
    {
      accent: "#6ae3c0",
      icon: Brain,
      label: "Quiz complétés",
      value: `${stats.completedSessions}`,
    },
    {
      accent: "#ff9f43",
      icon: Flame,
      label: "Meilleure série quiz",
      value:
        stats.bestCorrectAnswerStreak > 0
          ? `${stats.bestCorrectAnswerStreak} bonne${stats.bestCorrectAnswerStreak > 1 ? "s" : ""} réponse${stats.bestCorrectAnswerStreak > 1 ? "s" : ""} d'affilée`
          : "Aucune série",
    },
    {
      accent: "#78e08f",
      icon: Target,
      label: "Précision",
      value:
        stats.averageScorePercent === null
          ? "0%"
          : `${stats.averageScorePercent}%`,
    },
  ];
}

export default function QuizStatsPanel() {
  const { isAuthenticated, isLoading } = useAuth();
  const [stats, setStats] = useState<UserQuizStats | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (isLoading || !isAuthenticated) {
      return () => {
        isMounted = false;
      };
    }

    void getUserQuizStats()
      .then((nextStats) => {
        if (isMounted) {
          setStats(nextStats);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStats(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isLoading]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  if (!stats) {
    return null;
  }

  const items = buildStatItems(stats);

  return (
    <section className="mx-auto mt-8 w-full max-w-5xl">
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white/50">
        Tes statistiques
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ accent, icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-[20px] border border-white/10 bg-white/[0.045] p-4"
            style={{
              backgroundImage: `radial-gradient(circle at 88% 12%, ${accent}14, transparent 34%)`,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className="grid h-10 w-10 place-items-center rounded-2xl border"
                style={{
                  backgroundColor: `${accent}14`,
                  borderColor: `${accent}36`,
                  color: accent,
                }}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span
                className="h-1.5 w-10 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              />
            </div>
            <p className="mt-4 text-[11px] font-black uppercase tracking-[0.16em] text-white/42">
              {label}
            </p>
            <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">
              {value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
