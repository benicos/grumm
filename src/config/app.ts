export const siteConfig = {
  officialName: "Grumm",
  name: "Grumm.",
  description:
    "Grumm est une exp\u00e9rience de d\u00e9couverte verticale pour apprendre vite, retenir facilement et raconter ce qui marque.",
  fallbackUrl: "https://grumm.fr",
  publicUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://grumm.fr",
} as const;

export const appRoutes = {
  about: "/a-propos",
  admin: "/admin",
  contact: "/contact",
  discover: "/decouvrir",
  explorer: "/theme",
  forgotPassword: "/forgot-password",
  home: "/",
  login: "/login",
  legalNotice: "/mentions-legales",
  memoryChallenge: "/quiz/memoire",
  privacy: "/politique-confidentialite",
  profile: "/profil",
  profileEdit: "/profil/edit",
  quiz: "/quiz",
  register: "/register",
  resetPassword: "/reset-password",
} as const;

export const dailyGoalConfig = {
  defaultGoal: 10,
  maxGoal: 100,
  minGoal: 1,
  streakMessages: [
    { minCompletedGoals: 30, message: "30 jours. Grumm fait partie de ton quotidien." },
    { minCompletedGoals: 7, message: "7 jours cons\u00e9cutifs. Ta culture s\u2019installe." },
    { minCompletedGoals: 2, message: "Deux jours de suite. Le r\u00e9flexe commence." },
    { minCompletedGoals: 1, message: "Premier jour lanc\u00e9." },
  ],
} as const;

export const signupDailyGoalOptions = [5, 10, 20, 40] as const;

export const paginationConfig = {
  adminDefaultPageSize: 5,
  adminMaxPageSize: 50,
} as const;

export const discoverConfig = {
  feedBatchSize: 18,
  recentFeedStorageLimit: 120,
} as const;

export const userMessages = {
  emptyFactsDebug:
    "Aucun fait disponible pour le moment. Ajoute des contenus visibles dans l'administration pour alimenter cette page.",
  emptyFactsPublic:
    "Oups... Aucun fait n\u2019est disponible pour le moment, nous revenons tr\u00e8s vite !",
  genericLoadError: "Impossible de charger ce contenu pour le moment.",
} as const;

export const footerLinks = [
  { href: appRoutes.about, label: "\u00c0 propos" },
  { href: appRoutes.discover, label: "D\u00e9couvrir" },
  { href: appRoutes.explorer, label: "Th\u00e8mes" },
  { href: appRoutes.contact, label: "Contact" },
  { href: appRoutes.privacy, label: "Politique de confidentialit\u00e9" },
  { href: appRoutes.legalNotice, label: "Mentions l\u00e9gales" },
] as const;

export const socialShareConfig = {
  fallbackMessage:
    "Le partage direct d\u2019image n\u2019est pas disponible ici, mais tu peux toujours t\u00e9l\u00e9charger l\u2019image et la partager \u00e0 ta guise !",
  story: {
    height: 1920,
    pixelRatio: 3,
    previewHeight: 640,
    previewWidth: 360,
    width: 1080,
  },
} as const;

export const gradeIconOptions = [
  { value: "sparkles", label: "\u00c9tincelle" },
  { value: "compass", label: "Boussole" },
  { value: "telescope", label: "T\u00e9lescope" },
  { value: "brain", label: "Esprit" },
  { value: "book-open", label: "Livre" },
  { value: "flame", label: "Flamme" },
  { value: "star", label: "\u00c9toile" },
  { value: "trophy", label: "Troph\u00e9e" },
  { value: "crown", label: "Couronne" },
  { value: "gem", label: "Gemme" },
  { value: "shield-check", label: "Bouclier" },
  { value: "orbit", label: "Orbite" },
] as const;

export type GradeIconKey = (typeof gradeIconOptions)[number]["value"];
