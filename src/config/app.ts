export const siteConfig = {
  name: "Velora",
  description:
    "Découvre des faits courts, mémorables et immersifs dans une expérience premium.",
  fallbackUrl: "https://velora.app",
  publicUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://velora.app",
} as const;

export const appRoutes = {
  about: "/about",
  admin: "/admin",
  contact: "/contact",
  discover: "/discover",
  explorer: "/explorer",
  forgotPassword: "/forgot-password",
  home: "/",
  login: "/login",
  privacy: "/privacy-policy",
  profile: "/profile",
  profileEdit: "/profile/edit",
  register: "/register",
  resetPassword: "/reset-password",
} as const;

export const dailyGoalConfig = {
  defaultGoal: 10,
  maxGoal: 100,
  minGoal: 1,
} as const;

export const paginationConfig = {
  adminDefaultPageSize: 20,
  adminMaxPageSize: 50,
} as const;

export const discoverConfig = {
  feedBatchSize: 18,
  recentFeedStorageLimit: 120,
} as const;

export const userMessages = {
  emptyFactsDebug:
    "Aucun fait publié pour le moment. Ajoute des contenus publiés dans l'administration pour alimenter cette page.",
  emptyFactsPublic:
    "Oups... Aucun fait n’est disponible pour le moment, nous revenons très vite !",
  genericLoadError: "Impossible de charger ce contenu pour le moment.",
} as const;

export const footerLinks = [
  { href: appRoutes.privacy, label: "Politique de confidentialité" },
  { href: appRoutes.about, label: "À propos" },
  { href: appRoutes.contact, label: "Contact" },
] as const;

export const socialShareConfig = {
  fallbackMessage:
    "Le partage direct d’image n’est pas disponible ici. Télécharge l’image puis publie-la dans ta story Instagram.",
  story: {
    height: 1920,
    pixelRatio: 3,
    previewHeight: 640,
    previewWidth: 360,
    width: 1080,
  },
} as const;

export const gradeIconOptions = [
  { value: "sparkles", label: "Étincelle" },
  { value: "compass", label: "Boussole" },
  { value: "telescope", label: "Télescope" },
  { value: "brain", label: "Esprit" },
  { value: "book-open", label: "Livre" },
  { value: "flame", label: "Flamme" },
  { value: "star", label: "Étoile" },
  { value: "trophy", label: "Trophée" },
  { value: "crown", label: "Couronne" },
  { value: "gem", label: "Gemme" },
  { value: "shield-check", label: "Bouclier" },
  { value: "orbit", label: "Orbite" },
] as const;

export type GradeIconKey = (typeof gradeIconOptions)[number]["value"];
