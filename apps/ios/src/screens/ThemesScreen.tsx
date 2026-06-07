import * as Haptics from "expo-haptics";
import { Grid2X2, RotateCcw } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "../components/AppScreen";
import { EmptyState, LoadingState } from "../components/ScreenState";
import { ThemeCard } from "../components/ThemeCard";
import { userMessages } from "../config/app";
import { trackMobileAnalyticsEvent } from "../lib/analytics";
import { getExplorerData } from "../lib/facts";
import { appTheme } from "../theme/appTheme";
import type { CategorySummary } from "../types/domain";

type ThemesScreenProps = {
  onOpenTheme: (theme: CategorySummary) => void;
};

const themeFallbacks: Record<string, { description: string; icon: string }> = {
  art: { description: "Oeuvres, styles, regards.", icon: "palette" },
  cinema: { description: "Films, scènes, coulisses.", icon: "clapperboard" },
  geographie: { description: "Paysages, villes, frontières.", icon: "earth" },
  histoire: { description: "Dates, empires, tournants.", icon: "landmark" },
  musique: { description: "Sons, artistes, époques.", icon: "music" },
  personnalites: { description: "Vies, parcours, décisions.", icon: "users" },
  science: { description: "Idées claires, monde vivant.", icon: "flask-conical" },
  sport: { description: "Records, gestes, équipes.", icon: "trophy" },
};

export function ThemesScreen({ onOpenTheme }: ThemesScreenProps) {
  const [themes, setThemes] = useState<CategorySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <AppScreen scroll>
      <View style={styles.header}>
        <Text style={styles.kicker}>Explorer</Text>
        <Text style={styles.title}>Thèmes</Text>
        <Text style={styles.subtitle}>Choisis un univers, puis retourne au feed.</Text>
      </View>

      {themes.length > 0 ? (
        <View style={styles.grid}>
          {themes.map((theme) => (
            <ThemeCard
              description={getDescription(theme)}
              key={theme.slug}
              onPress={() => void openTheme(theme)}
              theme={theme}
            />
          ))}
        </View>
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

function getDescription(theme: CategorySummary) {
  return themeFallbacks[theme.slug]?.description ?? "Une piste courte pour découvrir.";
}

function withExistingSlugFallback(theme: CategorySummary): CategorySummary {
  return {
    ...theme,
    themeIcon: theme.themeIcon ?? themeFallbacks[theme.slug]?.icon ?? null,
  };
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  header: {
    gap: 4,
    paddingBottom: 16,
    paddingTop: 8,
  },
  kicker: {
    color: appTheme.color.teal,
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    textTransform: "uppercase",
  },
  subtitle: {
    color: appTheme.color.muted,
    fontSize: 14,
    fontWeight: appTheme.weight.medium,
    lineHeight: 20,
  },
  title: {
    color: appTheme.color.ink,
    fontSize: 24,
    fontWeight: appTheme.weight.bold,
    lineHeight: 29,
  },
});
