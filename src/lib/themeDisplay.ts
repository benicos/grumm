import { publicSiteTexts } from "@/config/site-texts";

export type ThemeDisplayData = {
  accent?: string | null;
  accent_color?: string | null;
  count?: number | null;
  description?: string | null;
  description_courte?: string | null;
  description_longue?: string | null;
  factsCount?: number | null;
  gradient_end?: string | null;
  gradient_middle?: string | null;
  gradient_start?: string | null;
  keywords?: string[] | null;
  name: string;
  slug: string;
  theme_icon?: string | null;
  tone?: string | null;
  visual_motif?: string | null;
};

const DEFAULT_GRADIENT = {
  end: "#f0a95a",
  middle: "#132744",
  start: "#0b1424",
};

const DEFAULT_ACCENT = "#ffd166";

export const themeMotifOptions = [
  "timeline",
  "globe",
  "topography",
  "soundwave",
  "music-note",
  "projector",
  "film",
  "molecule",
  "orbit",
  "constellation",
  "book",
  "library",
  "antique-column",
  "laurel",
  "silhouette",
  "portrait",
  "brush",
  "frame",
  "map",
  "architecture",
  "star",
] as const;

export type ThemeVisualMotif = (typeof themeMotifOptions)[number];

export const themeMotifLabels: Record<ThemeVisualMotif, string> = {
  "antique-column": "Colonne antique",
  architecture: "Architecture",
  book: "Livre",
  brush: "Pinceau",
  constellation: "Constellation",
  film: "Pellicule",
  frame: "Cadre",
  globe: "Globe",
  laurel: "Couronne de laurier",
  library: "Bibliothèque",
  map: "Carte",
  molecule: "Molécule",
  "music-note": "Note musicale",
  orbit: "Orbite",
  portrait: "Portrait",
  projector: "Projecteur",
  silhouette: "Silhouette",
  soundwave: "Onde sonore",
  star: "Étoile",
  timeline: "Chronologie",
  topography: "Topographie",
};

export function normalizeThemeMotif(value?: string | null): ThemeVisualMotif {
  return themeMotifOptions.includes(value as ThemeVisualMotif)
    ? (value as ThemeVisualMotif)
    : "constellation";
}

export function getThemeAccent(theme: ThemeDisplayData) {
  return theme.accent ?? theme.accent_color ?? DEFAULT_ACCENT;
}

export function getThemeGradientStops(theme: ThemeDisplayData) {
  const colors = [...(theme.tone ?? "").matchAll(/\[(#[0-9a-fA-F]{3,8})\]/g)]
    .map((match) => match[1])
    .filter(Boolean);

  return {
    end: theme.gradient_end ?? colors[2] ?? colors[1] ?? DEFAULT_GRADIENT.end,
    middle:
      theme.gradient_middle ?? colors[1] ?? colors[0] ?? DEFAULT_GRADIENT.middle,
    start: theme.gradient_start ?? colors[0] ?? DEFAULT_GRADIENT.start,
  };
}

export function getThemeTone(theme: ThemeDisplayData) {
  const stops = getThemeGradientStops(theme);

  return `from-[${stops.start}] via-[${stops.middle}] to-[${stops.end}]`;
}

export function getThemeGradientStyle(theme: ThemeDisplayData) {
  const stops = getThemeGradientStops(theme);

  return {
    backgroundImage: `linear-gradient(135deg, ${stops.start}, ${stops.middle}, ${stops.end})`,
  };
}

export function getThemeShortDescription(theme: ThemeDisplayData) {
  return (
    theme.description_courte?.trim() ||
    theme.description?.trim() ||
    publicSiteTexts.themeDescriptionFallback
  );
}

export function getThemeLongDescription(theme: ThemeDisplayData) {
  return (
    theme.description_longue?.trim() ||
    theme.description_courte?.trim() ||
    theme.description?.trim() ||
    publicSiteTexts.themeLongDescriptionFallback
  );
}

export function getThemeFactCount(theme: ThemeDisplayData) {
  return theme.factsCount ?? theme.count ?? 0;
}
