export type BadgeInfo = {
  currentThreshold: number;
  nextThreshold: number | null;
  progress: number;
  remaining: number | null;
  title: string;
};

export type GradeDefinition = {
  id?: string;
  slug: string;
  name: string;
  requiredGoals: number;
  description?: string | null;
  badge?: string | null;
  displayOrder?: number;
};

export const DEFAULT_GRADES: GradeDefinition[] = [
  { slug: "curieux-debutant", requiredGoals: 0, name: "Curieux debutant" },
  { slug: "explorateur-regulier", requiredGoals: 2, name: "Explorateur regulier" },
  { slug: "esprit-assidu", requiredGoals: 10, name: "Esprit assidu" },
  { slug: "maitre-curiosite", requiredGoals: 50, name: "Maitre de la curiosite" },
  { slug: "legende-savoir", requiredGoals: 100, name: "Legende du savoir" },
];

function normalizeGrades(grades?: GradeDefinition[] | null) {
  const source = grades && grades.length > 0 ? grades : DEFAULT_GRADES;

  return [...source]
    .filter((grade) => Number.isFinite(grade.requiredGoals))
    .sort((a, b) => {
      if (a.requiredGoals !== b.requiredGoals) {
        return a.requiredGoals - b.requiredGoals;
      }

      return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    });
}

export function getBadgeInfo(
  completedDailyGoals: number,
  grades?: GradeDefinition[] | null,
): BadgeInfo {
  const completed = Math.max(0, completedDailyGoals);
  const normalizedGrades = normalizeGrades(grades);
  const currentIndex = normalizedGrades.reduce(
    (activeIndex, grade, index) =>
      completed >= grade.requiredGoals ? index : activeIndex,
    0,
  );
  const current = normalizedGrades[currentIndex] ?? DEFAULT_GRADES[0];
  const next = normalizedGrades[currentIndex + 1] ?? null;

  if (!next) {
    return {
      currentThreshold: current.requiredGoals,
      nextThreshold: null,
      progress: 100,
      remaining: null,
      title: current.name,
    };
  }

  return {
    currentThreshold: current.requiredGoals,
    nextThreshold: next.requiredGoals,
    progress:
      ((completed - current.requiredGoals) /
        Math.max(next.requiredGoals - current.requiredGoals, 1)) *
      100,
    remaining: Math.max(next.requiredGoals - completed, 0),
    title: current.name,
  };
}

export function getGoalCelebrationMessage(completedDailyGoals: number) {
  if (completedDailyGoals >= 100) {
    return "Maitrise totale.";
  }

  if (completedDailyGoals >= 50) {
    return "Impressionnant.";
  }

  if (completedDailyGoals >= 10) {
    return "Belle regularite.";
  }

  if (completedDailyGoals >= 2) {
    return "Tu prends le rythme.";
  }

  return "Premier pas.";
}
