export type BadgeInfo = {
  currentThreshold: number;
  nextThreshold: number | null;
  progress: number;
  remaining: number | null;
  title: string;
};

const BADGES = [
  { threshold: 0, title: "Curieux débutant" },
  { threshold: 2, title: "Explorateur régulier" },
  { threshold: 10, title: "Esprit assidu" },
  { threshold: 50, title: "Maître de la curiosité" },
  { threshold: 100, title: "Légende du savoir" },
] as const;

export function getBadgeInfo(completedDailyGoals: number): BadgeInfo {
  const completed = Math.max(0, completedDailyGoals);
  const currentIndex = BADGES.reduce(
    (activeIndex, badge, index) =>
      completed >= badge.threshold ? index : activeIndex,
    0,
  );
  const current = BADGES[currentIndex];
  const next = BADGES[currentIndex + 1] ?? null;

  if (!next) {
    return {
      currentThreshold: current.threshold,
      nextThreshold: null,
      progress: 100,
      remaining: null,
      title: current.title,
    };
  }

  return {
    currentThreshold: current.threshold,
    nextThreshold: next.threshold,
    progress:
      ((completed - current.threshold) /
        Math.max(next.threshold - current.threshold, 1)) *
      100,
    remaining: Math.max(next.threshold - completed, 0),
    title: current.title,
  };
}

export function getGoalCelebrationMessage(completedDailyGoals: number) {
  if (completedDailyGoals >= 100) {
    return "Maîtrise totale.";
  }

  if (completedDailyGoals >= 50) {
    return "Impressionnant.";
  }

  if (completedDailyGoals >= 10) {
    return "Belle régularité.";
  }

  if (completedDailyGoals >= 2) {
    return "Tu prends le rythme.";
  }

  return "Premier pas.";
}
