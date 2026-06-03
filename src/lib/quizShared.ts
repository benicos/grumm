export const quizDifficultyOptions = ["easy", "standard", "hard"] as const;

export type QuizDifficulty = (typeof quizDifficultyOptions)[number];

export const quizDifficultyLabels: Record<QuizDifficulty, string> = {
  easy: "Facile",
  hard: "Difficile",
  standard: "Standard",
};

export function normalizeQuizDifficulty(value?: string | null): QuizDifficulty {
  return quizDifficultyOptions.includes(value as QuizDifficulty)
    ? (value as QuizDifficulty)
    : "standard";
}
