export const quizCopy = {
  buttons: {
    continue: "Continuer",
    relaunch: "Relancer",
    result: "Voir le résultat",
    reviewPrefix: "Relire :",
    returnProfile: "Retour profil",
  },
  empty: {
    description:
      "Lis encore quelques faits pour débloquer ton premier défi mémoire.",
    primaryLabel: "Lire quelques faits",
    title: "Pas encore prêt.",
  },
  generatedQuestionPrompt: "Quelle réponse correspond à ce fait :",
  customQuestionPrompt: "Une nouvelle question pour toi :",
  loading: "Préparation du défi mémoire...",
} as const;

const quizCopyVariants = {
  correctFeedback: [
    {
      detail: "Cette connaissance est bien restée.",
      title: "Exact.",
    },
    {
      detail: "La bonne association est retrouvée.",
      title: "Bonne réponse.",
    },
    {
      detail: "Ta mémoire progresse.",
      title: "C'est juste.",
    },
  ],
  resultHigh: [
    "Les faits sont bien retenus. La révision peut rester légère.",
    "Très bonne restitution. Les associations principales sont solides.",
  ],
  resultLow: [
    "La mémoire se reconstruit par passages courts. Relire quelques faits aidera à fixer les repères.",
    "Plusieurs associations restent à consolider. Une nouvelle lecture ciblée sera utile.",
  ],
  resultMedium: [
    "Une partie des repères est déjà en place. Une autre passe aidera à stabiliser le reste.",
    "Le souvenir progresse. Les faits les moins nets méritent une relecture courte.",
  ],
  wrongFeedback: [
    {
      detailPrefix: "Pas encore retenu. La bonne réponse était :",
      title: "À revoir calmement.",
    },
    {
      detailPrefix: "Ce fait mérite peut-être une seconde lecture. Réponse :",
      title: "À consolider.",
    },
    {
      detailPrefix: "Tu le retiendras mieux la prochaine fois. Réponse :",
      title: "Pas tout à fait.",
    },
  ],
} as const;

export type QuizCopyVariantKey = keyof typeof quizCopyVariants;

export function getRandomQuizCopy<Key extends QuizCopyVariantKey>(
  key: Key,
): (typeof quizCopyVariants)[Key][number] {
  const variants = quizCopyVariants[key];
  const index = Math.floor(Math.random() * variants.length);

  return variants[index];
}

export function getRandomQuizResultCopy(score: number, total: number): string {
  const ratio = score / Math.max(total, 1);

  if (ratio >= 0.8) {
    return getRandomQuizCopy("resultHigh");
  }

  if (ratio >= 0.5) {
    return getRandomQuizCopy("resultMedium");
  }

  return getRandomQuizCopy("resultLow");
}
