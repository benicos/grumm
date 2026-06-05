import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ThemeIconOption = {
  category: string;
  component: string;
  keywords: string[];
  name: string;
};

export type ThemeIconCategory = {
  label: string;
  options: ThemeIconOption[];
};

const legacyIconAliases: Record<string, string> = {
  "camera-retro": "camera",
  "chart-line": "chart-line",
  "earth-europe": "earth",
  flask: "flask-conical",
  microchip: "cpu",
  "scale-balanced": "scale",
  seedling: "sprout",
  "theater-masks": "drama",
  university: "landmark",
  "user-astronaut": "rocket",
};

function toKebabCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function toPascalCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function createOptions(
  category: string,
  names: string[],
  keywords: string[] = [],
): ThemeIconOption[] {
  return names.map((component) => ({
    category,
    component,
    keywords: [...keywords, toKebabCase(component), component.toLowerCase()],
    name: toKebabCase(component),
  }));
}

export const themeIconCategories: ThemeIconCategory[] = [
  {
    label: "Culture",
    options: createOptions("Culture", [
      "BookOpen",
      "BookMarked",
      "BookText",
      "Library",
      "Newspaper",
      "ScrollText",
      "GraduationCap",
      "NotebookText",
      "Quote",
      "Languages",
      "Archive",
      "Bookmark",
    ]),
  },
  {
    label: "Histoire",
    options: createOptions("Histoire", [
      "Landmark",
      "Castle",
      "Crown",
      "Flag",
      "FlagTriangleRight",
      "Shield",
      "Scroll",
      "Columns3",
      "Clock3",
      "CalendarDays",
      "Hourglass",
      "Church",
      "Building2",
    ]),
  },
  {
    label: "Science",
    options: createOptions("Science", [
      "Brain",
      "FlaskConical",
      "Microscope",
      "Atom",
      "Dna",
      "TestTube",
      "Activity",
      "HeartPulse",
      "Fingerprint",
      "Eye",
    ]),
  },
  {
    label: "Géographie",
    options: createOptions("Géographie", [
      "Globe",
      "Earth",
      "Mountain",
      "Compass",
      "Map",
      "MapPinned",
      "MapPin",
      "Route",
      "LandPlot",
      "Navigation",
    ]),
  },
  {
    label: "Espace",
    options: createOptions("Espace", [
      "Rocket",
      "Satellite",
      "Radar",
      "Telescope",
      "Orbit",
      "Moon",
      "Sun",
      "Sparkles",
      "Sparkle",
      "Star",
    ]),
  },
  {
    label: "Art",
    options: createOptions("Art", [
      "Palette",
      "Brush",
      "Paintbrush",
      "PenTool",
      "Pencil",
      "Image",
      "Shapes",
      "Aperture",
      "Camera",
      "Gem",
    ]),
  },
  {
    label: "Musique",
    options: createOptions("Musique", [
      "Music",
      "Headphones",
      "Disc3",
      "Radio",
      "Mic2",
      "AudioLines",
      "AudioWaveform",
      "Volume2",
      "Podcast",
      "Drum",
    ]),
  },
  {
    label: "Cinéma",
    options: createOptions("Cinéma", [
      "Film",
      "Clapperboard",
      "Projector",
      "Video",
      "Camera",
      "Ticket",
      "Drama",
      "Tv",
      "MonitorPlay",
      "Clapboard",
    ]),
  },
  {
    label: "Sport",
    options: createOptions("Sport", [
      "Trophy",
      "Medal",
      "Dumbbell",
      "Goal",
      "Bike",
      "Activity",
      "Gauge",
      "Timer",
      "Flame",
      "Award",
    ]),
  },
  {
    label: "Nature",
    options: createOptions("Nature", [
      "TreePine",
      "Trees",
      "Leaf",
      "Flower2",
      "Sprout",
      "Mountain",
      "Waves",
      "CloudSun",
      "Shell",
      "SunMedium",
    ]),
  },
  {
    label: "Océan",
    options: createOptions("Océan", [
      "Fish",
      "Anchor",
      "Ship",
      "Sailboat",
      "Waves",
      "Shell",
      "Droplets",
      "LifeBuoy",
      "Map",
      "Compass",
    ]),
  },
  {
    label: "Société",
    options: createOptions("Société", [
      "Users",
      "UserRound",
      "Briefcase",
      "ChartLine",
      "Scale",
      "BadgeEuro",
      "Coins",
      "Handshake",
      "Megaphone",
      "Lightbulb",
    ]),
  },
  {
    label: "Technologie",
    options: createOptions("Technologie", [
      "Cpu",
      "Network",
      "Code2",
      "Bot",
      "Blocks",
      "Puzzle",
      "KeyRound",
      "ScanSearch",
      "CircuitBoard",
      "Workflow",
    ]),
  },
];

export const themeIconOptions = themeIconCategories.flatMap(
  (category) => category.options,
);

export function normalizeThemeIconName(name?: string | null) {
  const normalized = toKebabCase(name?.trim() || "star");

  return legacyIconAliases[normalized] ?? normalized;
}

export function getThemeIconComponent(name?: string | null): LucideIcon {
  const normalized = normalizeThemeIconName(name);
  const option = themeIconOptions.find((item) => item.name === normalized);
  const componentName = option?.component ?? toPascalCase(normalized);
  const icon = (LucideIcons as unknown as Record<string, LucideIcon | undefined>)[
    componentName
  ];

  return icon ?? LucideIcons.Star;
}

