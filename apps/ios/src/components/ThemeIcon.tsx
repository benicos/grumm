import * as LucideIcons from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { createElement } from "react";

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

function getThemeIconComponent(name?: string | null): LucideIcon {
  const normalized = toKebabCase(name?.trim() || "star");
  const iconName = legacyIconAliases[normalized] ?? normalized;
  const componentName = toPascalCase(iconName);
  const icon = (LucideIcons as unknown as Record<string, LucideIcon | undefined>)[
    componentName
  ];

  return icon ?? LucideIcons.Star;
}

export function ThemeIcon({
  color,
  name,
  size,
  strokeWidth = 2.35,
}: {
  color: string;
  name?: string | null;
  size: number;
  strokeWidth?: number;
}) {
  const Icon = getThemeIconComponent(name);

  return createElement(Icon, { color, size, strokeWidth });
}
