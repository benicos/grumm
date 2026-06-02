import { dailyGoalConfig } from "@/config/app";

export type BadgeInfo = {
  badge: string | null;
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
  {
    slug: "curieux",
    requiredGoals: 0,
    name: "Curieux",
    description: "Tu viens d'ouvrir la porte.",
    badge: "sparkles",
  },
  {
    slug: "explorateur",
    requiredGoals: 25,
    name: "Explorateur",
    description: "Tu commences à parcourir les grands repères.",
    badge: "compass",
  },
  {
    slug: "collectionneur",
    requiredGoals: 75,
    name: "Collectionneur",
    description: "Ta bibliothèque personnelle prend forme.",
    badge: "book-open",
  },
  {
    slug: "erudit",
    requiredGoals: 150,
    name: "Érudit",
    description: "Tu relies les faits entre eux.",
    badge: "brain",
  },
  {
    slug: "chroniqueur",
    requiredGoals: 300,
    name: "Chroniqueur",
    description: "Tu fais de tes découvertes une mémoire structurée.",
    badge: "book-open",
  },
  {
    slug: "conservateur",
    requiredGoals: 500,
    name: "Conservateur",
    description: "Tu gardes les repères qui comptent.",
    badge: "shield-check",
  },
  {
    slug: "archiviste",
    requiredGoals: 750,
    name: "Archiviste",
    description: "Tu conserves une mémoire rare.",
    badge: "shield-check",
  },
  {
    slug: "gardien-du-savoir",
    requiredGoals: 1000,
    name: "Gardien du savoir",
    description: "Tu fais vivre ce que beaucoup oublient.",
    badge: "crown",
  },
  {
    slug: "sage-de-grumm",
    requiredGoals: 1500,
    name: "Sage de Grumm",
    description: "Ta culture devient un territoire personnel.",
    badge: "star",
  },
  {
    slug: "memoire-vivante",
    requiredGoals: 2500,
    name: "Mémoire vivante",
    description: "Tu portes une bibliothèque en mouvement.",
    badge: "trophy",
  },
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
      badge: current.badge ?? null,
      currentThreshold: current.requiredGoals,
      nextThreshold: null,
      progress: 100,
      remaining: null,
      title: current.name,
    };
  }

  return {
    badge: current.badge ?? null,
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
  const match = dailyGoalConfig.streakMessages.find(
    (item) => completedDailyGoals >= item.minCompletedGoals,
  );

  return match?.message ?? "Premier jour lancé.";
}
