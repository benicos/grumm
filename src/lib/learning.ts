export type LearningGoal = "basics" | "strengthen" | "advanced";
export type DifficultyLevel = "basic" | "intermediate" | "advanced";

export const DEFAULT_LEARNING_GOAL: LearningGoal = "strengthen";
export const DEFAULT_DIFFICULTY_LEVEL: DifficultyLevel = "intermediate";

export const learningGoalOptions: {
  description: string;
  label: string;
  value: LearningGoal;
}[] = [
  {
    description: "Des faits accessibles pour reconstruire des repères solides.",
    label: "Reprendre les bases",
    value: "basics",
  },
  {
    description: "Un équilibre entre rappels utiles et découvertes plus fines.",
    label: "Renforcer ma culture",
    value: "strengthen",
  },
  {
    description: "Plus de faits denses, précis ou moins évidents.",
    label: "Explorer des sujets avancés",
    value: "advanced",
  },
];

export const difficultyLevelOptions: {
  label: string;
  value: DifficultyLevel;
}[] = [
  { label: "Basique", value: "basic" },
  { label: "Intermédiaire", value: "intermediate" },
  { label: "Avancé", value: "advanced" },
];

export function normalizeLearningGoal(value: unknown): LearningGoal {
  return learningGoalOptions.some((option) => option.value === value)
    ? (value as LearningGoal)
    : DEFAULT_LEARNING_GOAL;
}

export function normalizeDifficultyLevel(value: unknown): DifficultyLevel {
  return difficultyLevelOptions.some((option) => option.value === value)
    ? (value as DifficultyLevel)
    : DEFAULT_DIFFICULTY_LEVEL;
}

export function getLearningGoalLabel(value: unknown) {
  const normalized = normalizeLearningGoal(value);

  return (
    learningGoalOptions.find((option) => option.value === normalized)?.label ??
    learningGoalOptions[1].label
  );
}

export function getDifficultyLevelLabel(value: unknown) {
  const normalized = normalizeDifficultyLevel(value);

  return (
    difficultyLevelOptions.find((option) => option.value === normalized)?.label ??
    difficultyLevelOptions[1].label
  );
}
