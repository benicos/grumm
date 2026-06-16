const fallbackThemeIcons: Record<string, string> = {
  art: "palette",
  cinema: "clapperboard",
  daily: "users-round",
  "daily-life": "users-round",
  geographie: "map",
  geography: "map",
  general: "sparkles",
  history: "landmark",
  histoire: "landmark",
  musique: "music",
  music: "music",
  people: "user-round",
  personnalites: "user-round",
  personalities: "user-round",
  quotidien: "users-round",
  "quotidien-societe": "users-round",
  science: "flask-conical",
  society: "users-round",
  sport: "trophy",
  sports: "trophy",
};

export function getThemeIconName(slug?: string | null, icon?: string | null) {
  const explicitIcon = icon?.trim();

  if (explicitIcon) {
    return explicitIcon;
  }

  return fallbackThemeIcons[slug?.trim() ?? ""] ?? "sparkles";
}
