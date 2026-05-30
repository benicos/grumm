export type LearningGoal = "basics" | "strengthen" | "advanced";

export const DEFAULT_LEARNING_GOAL: LearningGoal = "strengthen";

export const learningGoalOptions: {
  description: string;
  label: string;
  value: LearningGoal;
}[] = [
  {
    description: "Des faits accessibles pour reconstruire des reperes solides.",
    label: "Reprendre les bases",
    value: "basics",
  },
  {
    description: "Un equilibre entre rappels utiles et decouvertes plus fines.",
    label: "Renforcer ma culture",
    value: "strengthen",
  },
  {
    description: "Plus de faits denses, precis ou moins evidents.",
    label: "Explorer des sujets avances",
    value: "advanced",
  },
];

export function normalizeLearningGoal(value: unknown): LearningGoal {
  return learningGoalOptions.some((option) => option.value === value)
    ? (value as LearningGoal)
    : DEFAULT_LEARNING_GOAL;
}

export function getLearningGoalLabel(value: unknown) {
  const normalized = normalizeLearningGoal(value);

  return (
    learningGoalOptions.find((option) => option.value === normalized)?.label ??
    learningGoalOptions[1].label
  );
}
