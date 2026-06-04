import type { CSSProperties } from "react";

const DEFAULT_TONE = "linear-gradient(135deg, #0b1424, #132744, #f0a95a)";

type GradientDirection =
  | "to-bottom"
  | "to-bottom-right"
  | "to-right"
  | "to-top-right";

const CSS_DIRECTIONS: Record<GradientDirection, string> = {
  "to-bottom": "180deg",
  "to-bottom-right": "135deg",
  "to-right": "90deg",
  "to-top-right": "45deg",
};

function getCssDirectionFromTailwind(value: string): string {
  if (value.includes("bg-gradient-to-r")) return "90deg";
  if (value.includes("bg-gradient-to-b")) return "180deg";
  if (value.includes("bg-gradient-to-tr")) return "45deg";
  return "135deg";
}

export function getToneBackground(tone?: string | null): {
  className: string;
  style?: CSSProperties;
} {
  const value = tone?.trim() || DEFAULT_TONE;

  if (value.startsWith("linear-gradient(")) {
    return {
      className: "",
      style: { backgroundImage: value },
    };
  }

  const colors = [
    ...value.matchAll(
      /\[((?:#[0-9a-fA-F]{3,8})|(?:rgb\([^)]+\))|(?:rgba\([^)]+\)))\]/g
    ),
  ]
    .map((match) => match[1])
    .filter(Boolean);

  if (colors.length >= 2) {
    return {
      className: "",
      style: {
        backgroundImage: `linear-gradient(${getCssDirectionFromTailwind(value)}, ${colors.join(", ")})`,
      },
    };
  }

  return {
    className: value.includes("bg-gradient-")
      ? value
      : `bg-gradient-to-br ${value}`,
  };
}

export function buildCssGradient({
  from,
  to,
  via,
  direction,
}: {
  direction: GradientDirection;
  from: string;
  to: string;
  via?: string;
}) {
  const angle = CSS_DIRECTIONS[direction];
  const middle = via?.trim();

  return middle
    ? `linear-gradient(${angle}, ${from}, ${middle}, ${to})`
    : `linear-gradient(${angle}, ${from}, ${to})`;
}