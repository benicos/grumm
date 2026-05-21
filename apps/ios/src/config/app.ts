export const mobileConfig = {
  dailyGoal: 10,
  dailyGoalMax: 100,
  dailyGoalMin: 1,
  feedBatchSize: 12,
  siteName: "Velora",
  siteUrl: process.env.EXPO_PUBLIC_SITE_URL ?? "https://velora.app",
} as const;

export const userMessages = {
  authRequired: "Connecte-toi pour garder ta progression.",
  emptyFeed:
    "Oups... Aucun fait n'est disponible pour le moment, nous revenons très vite !",
  genericLoadError: "Impossible de charger Velora pour le moment.",
  missingSupabaseConfig:
    "La configuration de l'app est incomplète pour le moment.",
} as const;
