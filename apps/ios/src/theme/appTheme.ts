export const appTheme = {
  color: {
    accent: "#ff7a59",
    background: "#f8fafc",
    backgroundMint: "#eef8f3",
    backgroundViolet: "#f5f1ff",
    border: "rgba(24,32,51,0.10)",
    card: "#ffffff",
    cardSoft: "rgba(255,255,255,0.76)",
    danger: "#d84f68",
    green: "#47b881",
    ink: "#172033",
    muted: "#667085",
    teal: "#1ea7a1",
    violet: "#7c5cff",
    yellow: "#f2c94c",
  },
  gradient: {
    screen: ["#f8fafc", "#eef8f3", "#f5f1ff"] as const,
    activeTab: ["#172033", "#30405f"] as const,
    quiz: ["#7c5cff", "#ff7a59"] as const,
    memory: ["#1ea7a1", "#47b881"] as const,
  },
  radius: {
    card: 22,
    control: 16,
    pill: 999,
    screen: 28,
  },
  shadow: {
    card: {
      elevation: 5,
      shadowColor: "#172033",
      shadowOffset: { height: 10, width: 0 },
      shadowOpacity: 0.09,
      shadowRadius: 18,
    },
    tab: {
      elevation: 12,
      shadowColor: "#172033",
      shadowOffset: { height: 8, width: 0 },
      shadowOpacity: 0.13,
      shadowRadius: 22,
    },
  },
  space: {
    gutter: 16,
    lg: 20,
    md: 14,
    sm: 10,
    xl: 26,
    xs: 6,
  },
  themeAccents: [
    "#ff7a59",
    "#1ea7a1",
    "#7c5cff",
    "#47b881",
    "#f2a93b",
    "#4185f4",
    "#e05267",
    "#9b6bff",
  ] as const,
  type: {
    body: 15,
    caption: 12,
    section: 17,
    title: 24,
  },
  weight: {
    bold: "700",
    medium: "500",
    semibold: "600",
  },
} as const;

export function withAlpha(hexColor: string, alpha: number) {
  const normalized = hexColor.replace("#", "");

  if (normalized.length !== 6) {
    return hexColor;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}
