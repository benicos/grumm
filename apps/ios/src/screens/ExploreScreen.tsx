import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Play, Search, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingState, ScreenState } from "../components/ScreenState";
import { userMessages } from "../config/app";
import { trackMobileAnalyticsEvent } from "../lib/analytics";
import { getExplorerData } from "../lib/facts";
import { cleanFactSource } from "../lib/source";
import { colors } from "../theme/colors";
import { designTokens as ds } from "../theme/designTokens";
import type { CategorySummary, FeedFact } from "../types/domain";

const DEFAULT_THEME_IMAGE_URL =
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=900&q=80";

const THEME_IMAGE_FALLBACKS: Record<string, string> = {
  art: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=900&q=80",
  cinema: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
  espace: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=80",
  geographie: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
  histoire: "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?auto=format&fit=crop&w=900&q=80",
  musique: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80",
  ocean: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
  psychologie: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=900&q=80",
  science: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=900&q=80",
};

type ExploreScreenProps = {
  onOpenDiscover: () => void;
  onOpenFact: (fact: FeedFact) => void;
  onOpenTheme: (themeSlug: string) => void;
};

export function ExploreScreen({
  onOpenDiscover,
  onOpenFact,
  onOpenTheme,
}: ExploreScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [themes, setThemes] = useState<CategorySummary[]>([]);
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = submittedQuery.trim();
  const hasActiveSearch = normalizedQuery.length > 0;
  const compactCardWidth = Math.max(102, Math.floor((width - 48) / 3.25));
  const gridCardWidth = Math.floor((width - 48) / 3);
  const heroThemes = useMemo(() => themes.slice(0, 8), [themes]);
  const continueTheme = useMemo(() => themes[1] ?? themes[0] ?? null, [themes]);
  const gridThemes = useMemo(() => themes.slice(0, 24), [themes]);

  const loadExplorer = useCallback(async (searchValue?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const nextQuery = searchValue?.trim() || "";
      const data = await getExplorerData({
        includeFacts: Boolean(nextQuery),
        query: nextQuery || undefined,
      });
      setThemes(data.categories);
      setFacts(data.facts);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : userMessages.genericLoadError,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadExplorer();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadExplorer]);

  function submitSearch(nextValue = query) {
    const nextQuery = nextValue.trim();
    setQuery(nextValue);
    setSubmittedQuery(nextQuery);
    if (nextQuery) {
      void trackMobileAnalyticsEvent({
        eventName: "search_used",
        metadata: { query: nextQuery },
      });
    }
    void loadExplorer(nextQuery || undefined);
  }

  function clearSearch() {
    setQuery("");
    setSubmittedQuery("");
    void loadExplorer();
  }

  async function openTheme(theme: CategorySummary) {
    await Haptics.selectionAsync();
    onOpenTheme(theme.slug);
  }

  if (error && !isLoading) {
    return (
      <ScreenState
        actionLabel="Réessayer"
        message={error}
        onAction={loadExplorer}
        title="Thèmes indisponibles"
      />
    );
  }

  return (
    <LinearGradient
      colors={ds.gradient.app}
      end={{ x: 1, y: 1 }}
      start={{ x: 0.12, y: 0 }}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Thèmes</Text>
          <View style={styles.searchBox}>
            <Search color="rgba(248,250,252,0.56)" size={16} strokeWidth={2.1} />
            <TextInput
              autoCapitalize="none"
              blurOnSubmit
              onChangeText={setQuery}
              onSubmitEditing={() => submitSearch()}
              placeholder="Rechercher"
              placeholderTextColor="rgba(248,250,252,0.38)"
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            {hasActiveSearch ? (
              <Pressable onPress={clearSearch} style={styles.clearButton}>
                <X color="rgba(248,250,252,0.68)" size={16} strokeWidth={2.2} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {isLoading ? (
          <LoadingState
            label={hasActiveSearch ? "Recherche..." : "Chargement des thèmes..."}
          />
        ) : hasActiveSearch ? (
          <SearchResults
            facts={facts}
            onOpenDiscover={onOpenDiscover}
            onOpenFact={onOpenFact}
            submittedQuery={submittedQuery}
          />
        ) : (
          <>
            <SectionTitle title="Pour toi" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.heroScroller}
            >
              {heroThemes.map((theme) => (
                <ThemeCompactCard
                  key={theme.id}
                  onPress={() => void openTheme(theme)}
                  theme={theme}
                  width={compactCardWidth}
                />
              ))}
            </ScrollView>

            {continueTheme ? (
              <>
                <SectionTitle title="Continuer" />
                <ContinueThemeCard
                  onPress={() => void openTheme(continueTheme)}
                  theme={continueTheme}
                />
              </>
            ) : null}

            <SectionTitle title="Tous les thèmes" />
            <View style={styles.themeGrid}>
              {gridThemes.map((theme) => (
                <ThemeGridCard
                  key={theme.id}
                  onPress={() => void openTheme(theme)}
                  theme={theme}
                  width={gridCardWidth}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function SearchResults({
  facts,
  onOpenDiscover,
  onOpenFact,
  submittedQuery,
}: {
  facts: FeedFact[];
  onOpenDiscover: () => void;
  onOpenFact: (fact: FeedFact) => void;
  submittedQuery: string;
}) {
  return (
    <View style={styles.resultsBlock}>
      <Text style={styles.resultsTitle}>“{submittedQuery}”</Text>
      {facts.length > 0 ? (
        <View style={styles.factList}>
          {facts.map((fact) => (
            <FactResult fact={fact} key={fact.id} onPress={() => onOpenFact(fact)} />
          ))}
        </View>
      ) : (
        <View style={styles.noResult}>
          <Text style={styles.noResultTitle}>Aucun fait trouvé.</Text>
          <Pressable onPress={onOpenDiscover} style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>Ouvrir Découvrir</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function FactResult({ fact, onPress }: { fact: FeedFact; onPress: () => void }) {
  const source = cleanFactSource(fact.source);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.factResult, pressed && styles.pressed]}
    >
      <Text style={[styles.factCategory, { color: fact.accent }]}>
        {fact.category}
      </Text>
      <Text numberOfLines={2} style={styles.factTitle}>
        {fact.title}
      </Text>
      {source ? (
        <Text numberOfLines={1} style={styles.factSource}>
          {source}
        </Text>
      ) : null}
    </Pressable>
  );
}

function ThemeCompactCard({
  onPress,
  theme,
  width,
}: {
  onPress: () => void;
  theme: CategorySummary;
  width: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.compactCard,
        { width },
        pressed && styles.pressed,
      ]}
    >
      <ImageBackground
        imageStyle={styles.cardImage}
        source={{ uri: getThemeImage(theme) }}
        style={styles.compactImage}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.68)"]}
          style={styles.imageScrim}
        >
          <Text numberOfLines={1} style={styles.compactName}>
            {theme.name}
          </Text>
          <Text style={styles.compactCount}>{theme.count ?? 0} faits</Text>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

function ContinueThemeCard({
  onPress,
  theme,
}: {
  onPress: () => void;
  theme: CategorySummary;
}) {
  const progress = getThemeProgress(theme);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.continueCard, pressed && styles.pressed]}
    >
      <ImageBackground
        imageStyle={styles.cardImage}
        source={{ uri: getThemeImage(theme) }}
        style={styles.continueImage}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.78)"]}
          style={styles.continueScrim}
        >
          <View style={styles.playButton}>
            <Play color="#06111d" fill="#06111d" size={16} strokeWidth={2.4} />
          </View>
          <View style={styles.continueText}>
            <Text numberOfLines={1} style={styles.continueName}>
              {theme.name}
            </Text>
            <Text style={styles.continueMeta}>{progress}% complété</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

function ThemeGridCard({
  onPress,
  theme,
  width,
}: {
  onPress: () => void;
  theme: CategorySummary;
  width: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.gridCard,
        { width },
        pressed && styles.pressed,
      ]}
    >
      <ImageBackground
        imageStyle={styles.cardImage}
        source={{ uri: getThemeImage(theme) }}
        style={styles.gridImage}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.70)"]}
          style={styles.gridScrim}
        >
          <Text numberOfLines={2} style={styles.gridName}>
            {theme.name}
          </Text>
          <Text style={styles.gridCount}>{theme.count ?? 0}</Text>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

function getThemeImage(theme: CategorySummary) {
  return theme.imageUrl ?? THEME_IMAGE_FALLBACKS[theme.slug] ?? DEFAULT_THEME_IMAGE_URL;
}

function getThemeProgress(theme: CategorySummary) {
  const seed = [...theme.slug].reduce((sum, character) => sum + character.charCodeAt(0), 0);

  return 24 + (seed % 55);
}

const styles = StyleSheet.create({
  cardImage: {
    borderRadius: 18,
  },
  clearButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 28,
  },
  compactCard: {
    borderRadius: 18,
    height: 128,
    overflow: "hidden",
  },
  compactCount: {
    color: "rgba(248,250,252,0.72)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  compactImage: {
    flex: 1,
  },
  compactName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  content: {
    gap: 13,
    paddingBottom: 28,
    paddingHorizontal: 14,
  },
  continueCard: {
    borderRadius: 20,
    height: 148,
    overflow: "hidden",
  },
  continueImage: {
    flex: 1,
  },
  continueMeta: {
    color: "rgba(248,250,252,0.72)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  continueName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  continueScrim: {
    flex: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  continueText: {
    alignSelf: "flex-end",
    flex: 1,
  },
  factCategory: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  factList: {
    gap: 9,
  },
  factResult: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
  },
  factSource: {
    color: "rgba(248,250,252,0.42)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 7,
  },
  factTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: 6,
  },
  glowTop: {
    backgroundColor: "rgba(255,209,102,0.12)",
    borderRadius: 999,
    height: 220,
    position: "absolute",
    right: -105,
    top: -85,
    width: 220,
  },
  gridCard: {
    borderRadius: 18,
    height: 116,
    overflow: "hidden",
  },
  gridCount: {
    color: "rgba(248,250,252,0.70)",
    fontSize: 11,
    fontWeight: "700",
  },
  gridImage: {
    flex: 1,
  },
  gridName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 17,
  },
  gridScrim: {
    flex: 1,
    justifyContent: "space-between",
    padding: 10,
  },
  header: {
    gap: 10,
  },
  heroScroller: {
    gap: 8,
    paddingRight: 14,
  },
  imageScrim: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 10,
  },
  noResult: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 15,
  },
  noResultTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  playButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  primaryAction: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 14,
  },
  primaryActionText: {
    color: "#06111d",
    fontSize: 12,
    fontWeight: "800",
  },
  progressFill: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: "100%",
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    height: 5,
    marginTop: 9,
    overflow: "hidden",
  },
  resultsBlock: {
    gap: 12,
  },
  resultsTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 29,
  },
  root: {
    flex: 1,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.075)",
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    minHeight: 40,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 2,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: 36,
  },
});
