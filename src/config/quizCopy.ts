export const quizCopy = {
  buttons: {
    continue: "Continuer",
    relaunch: "Relancer",
    result: "Voir le résultat",
    reviewPrefix: "Relire :",
    returnProfile: "Retour profil",
    returnQuiz: "Retour au quiz",
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
      detail: "Un nouveau fait est bien ancré. C'est parti pour le suivant !",
      title: "Exact.",
    },
    {
      detail: "Top, tu as retenu ce fait. En route pour le prochain !",
      title: "Bonne réponse.",
    },
    {
      detail: "Tu as retenu ce fait. Continuons avec le suivant !",
      title: "Bingo !",
    },
  ],
  resultHigh: [
    "Bravo, tu mémorises vite ! Continue à explorer les faits pour renforcer tes connaissances.",
    "Wow, tu as un super score ! Tu mémorises vraiment bien. Continue à lire pour apprendre davantage.",
  ],
  resultLow: [
    "Pas de panique, la mémoire a besoin de temps et de répétitions pour se renforcer. Relis les faits et retente le quiz, tu verras des progrès !",
    "La mémoire est un muscle qui se travaille. Relis les faits et retente le quiz, tu vas y arriver !",
  ],
  resultMedium: [
    "Difficile de tout retenir du premier coup, c'est normal. Si tu en as retenu certains, c'est déjà super !",
    "Les souvenirs progressent. Les faits les moins nets méritent une relecture courte.",
  ],
  wrongFeedback: [
    {
      detailPrefix: "La bonne réponse était :",
      title: "Oups, ce n'était pas vraiment ça.",
    },
    {
      detailPrefix: "Ce fait mérite peut-être une seconde lecture. Réponse :",
      title: "La prochaine sera la bonne !",
    },
    {
      detailPrefix: "Pas vraiment, la bonne réponse était :",
      title: "Malheureusement non !",
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
