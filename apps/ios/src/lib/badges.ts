export type GradeDefinition = {
  badge?: string | null;
  displayOrder?: number;
  id?: string;
  name: string;
  requiredGoals: number;
  slug: string;
};

export const DEFAULT_GRADES: GradeDefinition[] = [
  { badge: "sparkles", name: "Curieux débutant", requiredGoals: 0, slug: "curieux-debutant" },
  { badge: "compass", name: "Explorateur régulier", requiredGoals: 2, slug: "explorateur-regulier" },
  { badge: "flame", name: "Esprit assidu", requiredGoals: 10, slug: "esprit-assidu" },
  { badge: "trophy", name: "Maître de la curiosité", requiredGoals: 50, slug: "maitre-curiosite" },
  { badge: "crown", name: "Légende du savoir", requiredGoals: 100, slug: "legende-savoir" },
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

export function getBadgeInfo(completedDailyGoals: number, grades?: GradeDefinition[] | null) {
  const completed = Math.max(0, completedDailyGoals);
  const normalizedGrades = normalizeGrades(grades);
  const currentIndex = normalizedGrades.reduce(
    (activeIndex, grade, index) => (completed >= grade.requiredGoals ? index : activeIndex),
    0,
  );
  const current = normalizedGrades[currentIndex] ?? DEFAULT_GRADES[0];

  return {
    badge: current.badge ?? null,
    title: current.name,
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
