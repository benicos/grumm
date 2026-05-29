import { LinearGradient } from "expo-linear-gradient";
import { Search, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingState, ScreenState } from "../components/ScreenState";
import { userMessages } from "../config/app";
import { trackMobileAnalyticsEvent } from "../lib/analytics";
import { getExplorerData } from "../lib/facts";
import { colors } from "../theme/colors";
import type { CategorySummary, FeedFact } from "../types/domain";

type ExploreScreenProps = {
  onOpenDiscover: () => void;
  onOpenFact: (fact: FeedFact) => void;
};

export function ExploreScreen({ onOpenDiscover, onOpenFact }: ExploreScreenProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [themes, setThemes] = useState<CategorySummary[]>([]);
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = submittedQuery.trim();
  const hasActiveSearch = normalizedQuery.length > 0;
  const visibleFacts = useMemo(() => (hasActiveSearch ? facts : facts.slice(0, 3)), [facts, hasActiveSearch]);
  const visibleThemes = useMemo(() => themes.slice(0, 8), [themes]);

  const loadExplorer = useCallback(async (searchValue?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getExplorerData({ query: searchValue || undefined });
      setThemes(data.categories);
      setFacts(data.facts);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : userMessages.genericLoadError);
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

  if (error && !isLoading) {
    return <ScreenState actionLabel="Réessayer" message={error} onAction={loadExplorer} title="Explorer est indisponible" />;
  }

  return (
    <LinearGradient colors={["#07111f", "#132338", "#050812"]} start={{ x: 0.15, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 22 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Explorer</Text>
          <Text style={styles.title}>Trouve le fait qui va te rester en tête.</Text>
          <Text style={styles.copy}>Un thème, une source, une idée. Lance une recherche précise, puis ouvre le fait qui accroche.</Text>

          <View style={styles.searchBox}>
            <Search color="rgba(248,250,252,0.62)" size={20} strokeWidth={2.2} />
            <TextInput
              autoCapitalize="none"
              blurOnSubmit
              onChangeText={setQuery}
              onSubmitEditing={() => submitSearch()}
              placeholder="Espace, histoire, psychologie, NASA..."
              placeholderTextColor="rgba(248,250,252,0.42)"
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            {hasActiveSearch ? (
              <Pressable accessibilityRole="button" onPress={clearSearch} style={styles.clearButton}>
                <X color="rgba(248,250,252,0.74)" size={18} strokeWidth={2.35} />
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={() => submitSearch()} style={styles.searchButton}>
              <Text style={styles.searchButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <LoadingState label={hasActiveSearch ? "Recherche en cours..." : "Préparation d'Explorer..."} />
        ) : hasActiveSearch ? (
          <SearchResults facts={visibleFacts} onOpenFact={onOpenFact} onOpenDiscover={onOpenDiscover} submittedQuery={submittedQuery} />
        ) : (
          <>
            <View style={styles.topicBlock}>
              <Text style={styles.sectionKicker}>Quelques pistes</Text>
              {visibleThemes.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeScroller}>
                  {visibleThemes.map((theme, index) => (
                    <ThemePill
                      key={`${theme.id}:${theme.slug}:${index}`}
                      onPress={() => submitSearch(theme.name)}
                      theme={theme}
                    />
                  ))}
                </ScrollView>
              ) : (
                <EmptyText>Aucun thème disponible.</EmptyText>
              )}
            </View>

            <View style={styles.discoverBlock}>
              <Text style={styles.sectionKicker}>À découvrir</Text>
              <Text style={styles.sectionTitle}>{"Aujourd'hui sur Grumm."}</Text>
              {visibleFacts.length > 0 ? (
                <View style={styles.factList}>
                  {visibleFacts.map((fact) => (
                    <FactRow fact={fact} key={fact.id} onPress={() => onOpenFact(fact)} />
                  ))}
                </View>
              ) : (
                    <EmptyText>Aucun fait disponible pour le moment.</EmptyText>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
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
      <Text style={styles.sectionKicker}>Recherche</Text>
      <Text style={styles.sectionTitle}>Résultats pour “{submittedQuery}”</Text>
      {facts.length > 0 ? (
        <View style={styles.factList}>
          {facts.map((fact) => (
            <FactRow compact fact={fact} key={fact.id} onPress={() => onOpenFact(fact)} />
          ))}
        </View>
      ) : (
        <NoResultBanner onOpenDiscover={onOpenDiscover} />
      )}
    </View>
  );
}

function EmptyText({ children }: { children: string }) {
  return <Text style={styles.empty}>{children}</Text>;
}

function NoResultBanner({ onOpenDiscover }: { onOpenDiscover: () => void }) {
  return (
    <View style={styles.noResult}>
      <Text style={styles.noResultKicker}>Aucun résultat</Text>
      <Text style={styles.noResultTitle}>Aucun fait ne correspond à cette recherche.</Text>
      <Text style={styles.noResultText}>{"Ouvre le flux pour repartir d'une découverte fraîche."}</Text>
      <Pressable onPress={onOpenDiscover} style={styles.primaryAction}>
        <Text style={styles.primaryActionText}>Voir les faits</Text>
      </Pressable>
    </View>
  );
}

function FactRow({ compact = false, fact, onPress }: { compact?: boolean; fact: FeedFact; onPress: () => void }) {
  const source = fact.source?.trim();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.factRow, pressed && styles.pressed]}>
      <View style={styles.factMeta}>
        <Text style={[styles.category, { color: fact.accent }]} numberOfLines={1}>
          {fact.category}
        </Text>
        {source ? (
          <Text style={styles.source} numberOfLines={1}>
            {source}
          </Text>
        ) : null}
      </View>
      <Text numberOfLines={compact ? 2 : 3} style={styles.factTitle}>
        {fact.title}
      </Text>
      {!compact ? (
        <Text numberOfLines={3} style={styles.factDetail}>
          {fact.detail}
        </Text>
      ) : null}
    </Pressable>
  );
}

function ThemePill({ onPress, theme }: { onPress: () => void; theme: CategorySummary }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.themePill, pressed && styles.pressed]}>
      <View style={[styles.themeDot, { backgroundColor: theme.accent }]} />
      <Text numberOfLines={1} style={styles.themeName}>
        {theme.name}
      </Text>
      <Text style={styles.themeCount}>{theme.count ?? 0}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  category: {
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  clearButton: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 30,
  },
  content: {
    gap: 26,
    paddingBottom: 30,
    paddingHorizontal: 18,
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: 12,
  },
  discoverBlock: {
    gap: 12,
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  factDetail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
  },
  factList: {
    gap: 12,
  },
  factMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  factRow: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderColor: "rgba(255,255,255,0.11)",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  factTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 24,
    marginTop: 10,
  },
  glowBottom: {
    backgroundColor: "rgba(106,227,192,0.10)",
    borderRadius: 999,
    bottom: -120,
    height: 260,
    left: -110,
    position: "absolute",
    width: 260,
  },
  glowTop: {
    backgroundColor: "rgba(255,209,102,0.15)",
    borderRadius: 999,
    height: 280,
    position: "absolute",
    right: -110,
    top: -80,
    width: 280,
  },
  hero: {
    paddingTop: 18,
  },
  noResult: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  noResultKicker: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  noResultText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
  },
  noResultTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25,
  },
  pressed: {
    opacity: 0.74,
  },
  primaryAction: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: 15,
    justifyContent: "center",
    marginTop: 6,
    minHeight: 44,
    paddingHorizontal: 15,
  },
  primaryActionText: {
    color: "#06111d",
    fontSize: 13,
    fontWeight: "900",
  },
  resultsBlock: {
    gap: 14,
  },
  root: {
    flex: 1,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "rgba(5,8,18,0.48)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    marginTop: 24,
    minHeight: 60,
    paddingHorizontal: 16,
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 15,
    height: 42,
    justifyContent: "center",
    minWidth: 48,
    paddingHorizontal: 12,
  },
  searchButtonText: {
    color: "#06111d",
    fontSize: 13,
    fontWeight: "900",
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    minHeight: 54,
  },
  sectionKicker: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: 4,
  },
  source: {
    color: "rgba(248,250,252,0.42)",
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
    maxWidth: "44%",
  },
  themeCount: {
    color: "rgba(248,250,252,0.56)",
    fontSize: 12,
    fontWeight: "900",
  },
  themeDot: {
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  themeName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
    maxWidth: 150,
  },
  themePill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.075)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  themeScroller: {
    gap: 10,
    paddingRight: 18,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 42,
    marginTop: 9,
  },
  topicBlock: {
    gap: 12,
  },
});
