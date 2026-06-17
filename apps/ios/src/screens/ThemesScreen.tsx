import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRight, Grid2X2, RotateCcw, Shuffle, Sparkles } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AppScreen } from "../components/AppScreen";
import { EmptyState, LoadingState } from "../components/ScreenState";
import { ThemeIcon } from "../components/ThemeIcon";
import { userMessages } from "../config/app";
import { trackMobileAnalyticsEvent } from "../lib/analytics";
import { getExplorerData } from "../lib/facts";
import { appTheme, withAlpha } from "../theme/appTheme";
import type { CategorySummary } from "../types/domain";

type ThemesScreenProps = {
  onOpenTheme: (theme: CategorySummary) => void;
};

const themeFallbacks: Record<string, { description: string; icon: string }> = {
  art: { description: "Œuvres célèbres, artistes et détails cachés.", icon: "palette" },
  "arts-litterature": { description: "Œuvres célèbres, auteurs et détails cachés.", icon: "palette" },
  cinema: { description: "Films cultes, scènes et coulisses.", icon: "clapperboard" },
  geographie: { description: "Pays, villes, frontières et repères du monde.", icon: "earth" },
  histoire: { description: "Dates, personnages et événements clés.", icon: "landmark" },
  musique: { description: "Artistes, morceaux et histoires sonores.", icon: "music" },
  personnalites: { description: "Figures connues, parcours et héritages.", icon: "users" },
  science: { description: "Comprendre le monde sans jargon.", icon: "flask-conical" },
  sport: { description: "Exploits, règles et grands moments.", icon: "trophy" },
};

const starterThemeSlugs = [
  "histoire",
  "science",
  "cinema",
  "art",
  "arts-litterature",
  "geographie",
];

const starterCopies: Record<string, string> = {
  art: "Œuvres & détails",
  "arts-litterature": "Œuvres & auteurs",
  cinema: "Films cultes",
  geographie: "Cartes & frontières",
  histoire: "Dates et symboles",
  musique: "Morceaux & récits",
  personnalites: "Figures et héritages",
  science: "Idées claires",
  sport: "Gestes et exploits",
};

export function ThemesScreen({ onOpenTheme }: ThemesScreenProps) {
  const [themes, setThemes] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [randomError, setRandomError] = useState<string | null>(null);
  const starterThemes = useMemo(() => getStarterThemes(themes), [themes]);

  const loadThemes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getExplorerData();
      setThemes(data.categories.map(withExistingSlugFallback));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : userMessages.genericLoadError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadThemes();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadThemes]);

  async function openTheme(theme: CategorySummary) {
    await Haptics.selectionAsync();
    void trackMobileAnalyticsEvent({
      entityId: theme.id,
      entityType: "category",
      eventName: "category_opened",
      metadata: { slug: theme.slug },
    });
    onOpenTheme(theme);
  }

  async function openRandomTheme() {
    setRandomError(null);

    const availableThemes = themes.filter((theme) => (theme.count ?? 0) > 0);

    if (availableThemes.length === 0) {
      setRandomError("Aucun thème disponible pour le moment.");
      return;
    }

    const theme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
    await openTheme(theme);
  }

  if (isLoading) {
    return (
      <AppScreen>
        <LoadingState label="Chargement des thèmes..." />
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen>
        <EmptyState
          Icon={RotateCcw}
          actionLabel="Réessayer"
          message={error}
          onAction={() => void loadThemes()}
          title="Thèmes indisponibles"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentStyle={styles.content} scroll>
      <View style={styles.header}>
        <Text style={styles.kicker}>Explorer</Text>
        <Text style={styles.title}>Que veux-tu découvrir ?</Text>
        <Text style={styles.subtitle}>Choisis un univers, ou laisse Grumm te surprendre.</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => void openRandomTheme()}
        style={({ pressed }) => [styles.randomPressable, pressed && styles.pressed]}
      >
        <LinearGradient
          colors={["#172033", "#284764", "#1ea7a1"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.randomCard}
        >
          <View style={styles.randomTopRow}>
            <View style={styles.randomIcon}>
              <Sparkles color="#ffffff" size={20} strokeWidth={2.35} />
            </View>
            <Text style={styles.randomEyebrow}>Découverte guidée</Text>
          </View>
          <View style={styles.randomCopy}>
            <Text style={styles.randomTitle}>Un thème au hasard</Text>
            <Text style={styles.randomText}>
              Laisse Grumm choisir un univers, puis plonge dans une série de faits courts.
            </Text>
          </View>
          <View style={styles.randomCta}>
            <Shuffle color={appTheme.color.ink} size={17} strokeWidth={2.4} />
            <Text style={styles.randomCtaText}>Explorer un thème</Text>
          </View>
        </LinearGradient>
      </Pressable>
      {randomError ? <Text style={styles.inlineError}>{randomError}</Text> : null}

      {themes.length > 0 ? (
        <>
          {starterThemes.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pour commencer</Text>
              <View style={styles.starterGrid}>
                {starterThemes.map((theme) => (
                  <StarterThemeCard
                    key={theme.slug}
                    onPress={() => void openTheme(theme)}
                    theme={theme}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tous les thèmes</Text>
            <View style={styles.themeGrid}>
              {themes.map((theme, index) => (
                <ThemeTile
                  description={getDescription(theme)}
                  index={index}
                  key={theme.slug}
                  onPress={() => void openTheme(theme)}
                  theme={theme}
                />
              ))}
            </View>
          </View>
        </>
      ) : (
        <EmptyState
          Icon={Grid2X2}
          actionLabel="Actualiser"
          message="Aucun thème disponible pour le moment."
          onAction={() => void loadThemes()}
          title="Thèmes vides"
        />
      )}
    </AppScreen>
  );
}

function StarterThemeCard({
  onPress,
  theme,
}: {
  onPress: () => void;
  theme: CategorySummary;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.starterCard,
        { borderColor: withAlpha(theme.accent, 0.24) },
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={[withAlpha(theme.accent, 0.15), withAlpha(theme.accent, 0.06)]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.starterCardInner}
      >
        <View style={styles.starterTopLine}>
          <View style={[styles.starterIcon, { backgroundColor: withAlpha(theme.accent, 0.16) }]}>
            <ThemeIcon color={theme.accent} name={theme.themeIcon} size={16} />
          </View>
          <ArrowRight color={theme.accent} size={15} strokeWidth={2.5} />
        </View>
        <View style={styles.starterTextBlock}>
          <Text numberOfLines={1} style={styles.starterTitle}>{theme.name}</Text>
          <Text numberOfLines={1} style={styles.starterMeta}>{getStarterCopy(theme)}</Text>
        </View>
        <View style={styles.starterAction}>
          <Text style={[styles.starterActionText, { color: theme.accent }]}>Entrer</Text>
          <ArrowRight color={theme.accent} size={14} strokeWidth={2.5} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function ThemeTile({
  description,
  index,
  onPress,
  theme,
}: {
  description: string;
  index: number;
  onPress: () => void;
  theme: CategorySummary;
}) {
  const accent = theme.accent || appTheme.themeAccents[index % appTheme.themeAccents.length];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.themeTile,
        { borderColor: withAlpha(accent, 0.2) },
        pressed && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={[withAlpha(accent, index % 2 === 0 ? 0.15 : 0.12), "rgba(255,255,255,0.62)"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.themeTileInner}
      >
        <View style={[styles.themeDecorLine, { backgroundColor: withAlpha(accent, 0.18) }]} />
        <View style={[styles.themeDecorStroke, { borderColor: withAlpha(accent, 0.18) }]} />
        <View style={styles.themeTileTop}>
          <View style={[styles.themeTileIcon, { backgroundColor: withAlpha(accent, 0.16) }]}>
            <ThemeIcon color={accent} name={theme.themeIcon} size={18} />
          </View>
        </View>
        <View style={styles.themeTileCopy}>
          <Text numberOfLines={1} style={styles.themeTileTitle}>{theme.name}</Text>
          <Text numberOfLines={2} style={styles.themeTileDescription}>{description}</Text>
        </View>
        <View style={styles.themeAction}>
          <Text style={[styles.themeActionText, { color: accent }]}>Entrer dans le thème</Text>
          <ArrowRight color={accent} size={14} strokeWidth={2.5} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function getStarterThemes(themes: CategorySummary[]) {
  const selected = new Map<string, CategorySummary>();

  starterThemeSlugs.forEach((slug) => {
    const theme = themes.find((candidate) => candidate.slug === slug);

    if (theme) {
      selected.set(theme.slug, theme);
    }
  });

  [...themes]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .forEach((theme) => {
      if (selected.size < 3) {
        selected.set(theme.slug, theme);
      }
    });

  return [...selected.values()].slice(0, 3);
}

function getDescription(theme: CategorySummary) {
  return themeFallbacks[theme.slug]?.description ?? "Une porte d'entrée pour découvrir autrement.";
}

function getStarterCopy(theme: CategorySummary) {
  return starterCopies[theme.slug] ?? "Curiosités utiles";
}

function withExistingSlugFallback(theme: CategorySummary): CategorySummary {
  return {
    ...theme,
    themeIcon: theme.themeIcon ?? themeFallbacks[theme.slug]?.icon ?? null,
  };
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingTop: 8,
  },
  header: {
    gap: 5,
  },
  kicker: {
    color: appTheme.color.teal,
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    color: appTheme.color.ink,
    fontSize: 26,
    fontWeight: appTheme.weight.bold,
    lineHeight: 31,
  },
  subtitle: {
    color: appTheme.color.muted,
    fontSize: 14,
    fontWeight: appTheme.weight.medium,
    lineHeight: 20,
  },
  randomPressable: {
    borderRadius: appTheme.radius.card,
  },
  randomCard: {
    borderRadius: appTheme.radius.card,
    gap: 16,
    overflow: "hidden",
    padding: 18,
  },
  randomTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  randomIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: appTheme.radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  randomEyebrow: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    textTransform: "uppercase",
  },
  randomCopy: {
    gap: 6,
  },
  randomTitle: {
    color: "#ffffff",
    fontSize: 23,
    fontWeight: appTheme.weight.bold,
    lineHeight: 28,
  },
  randomText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    fontWeight: appTheme.weight.medium,
    lineHeight: 21,
  },
  randomCta: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: appTheme.radius.pill,
    flexDirection: "row",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  randomCtaText: {
    color: appTheme.color.ink,
    fontSize: 14,
    fontWeight: appTheme.weight.bold,
  },
  inlineError: {
    color: appTheme.color.danger,
    fontSize: 13,
    fontWeight: appTheme.weight.semibold,
    marginTop: -8,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: appTheme.color.ink,
    fontSize: 17,
    fontWeight: appTheme.weight.bold,
    lineHeight: 22,
  },
  starterGrid: {
    flexDirection: "row",
    gap: 8,
  },
  starterCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "30%",
    flexGrow: 1,
    minHeight: 104,
    overflow: "hidden",
  },
  starterCardInner: {
    flex: 1,
    gap: 9,
    padding: 11,
  },
  starterTopLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  starterIcon: {
    alignItems: "center",
    borderRadius: appTheme.radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  starterTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  starterTitle: {
    color: appTheme.color.ink,
    fontSize: 15,
    fontWeight: appTheme.weight.bold,
  },
  starterMeta: {
    color: appTheme.color.muted,
    fontSize: 12,
    fontWeight: appTheme.weight.medium,
    marginTop: 2,
  },
  starterAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
  },
  starterActionText: {
    fontSize: 11.5,
    fontWeight: appTheme.weight.bold,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeTile: {
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 154,
    overflow: "hidden",
    width: "48%",
  },
  themeTileInner: {
    flex: 1,
    gap: 13,
    overflow: "hidden",
    padding: 12,
  },
  themeDecorLine: {
    height: 3,
    position: "absolute",
    right: 12,
    top: 10,
    transform: [{ rotate: "-18deg" }],
    width: 52,
  },
  themeDecorStroke: {
    borderRadius: 18,
    borderWidth: 1,
    height: 42,
    position: "absolute",
    right: -18,
    top: 58,
    transform: [{ rotate: "-16deg" }],
    width: 74,
  },
  themeTileTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  themeTileIcon: {
    alignItems: "center",
    borderRadius: appTheme.radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  themeTileCopy: {
    gap: 5,
  },
  themeTileTitle: {
    color: appTheme.color.ink,
    fontSize: 15,
    fontWeight: appTheme.weight.bold,
    lineHeight: 19,
  },
  themeTileDescription: {
    color: appTheme.color.muted,
    fontSize: 12.5,
    fontWeight: appTheme.weight.medium,
    lineHeight: 17,
  },
  themeAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: "auto",
  },
  themeActionText: {
    fontSize: 11.5,
    fontWeight: appTheme.weight.bold,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
