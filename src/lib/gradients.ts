import type { CSSProperties } from "react";

const DEFAULT_TONE = "from-[#0b1424] via-[#132744] to-[#f0a95a]";

const CSS_DIRECTIONS: Record<string, string> = {
  "to-bottom": "180deg",
  "to-bottom-right": "135deg",
  "to-right": "90deg",
  "to-top-right": "45deg",
};

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

  const colors = [...value.matchAll(/\[(#[0-9a-fA-F]{3,8})\]/g)]
    .map((match) => match[1])
    .filter(Boolean);

  if (colors.length >= 2) {
    return {
      className: "",
      style: {
        backgroundImage: `linear-gradient(135deg, ${colors.join(", ")})`,
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
  direction: string;
  from: string;
  to: string;
  via?: string;
}) {
  const angle = CSS_DIRECTIONS[direction] ?? CSS_DIRECTIONS["to-bottom-right"];
  const middle = via?.trim();

  return middle
    ? `linear-gradient(${angle}, ${from}, ${middle}, ${to})`
    : `linear-gradient(${angle}, ${from}, ${to})`;
}
