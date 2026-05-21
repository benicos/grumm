import { LinearGradient } from "expo-linear-gradient";
import { Search } from "lucide-react-native";
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
  const [recentFacts, setRecentFacts] = useState<FeedFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = submittedQuery.trim();
  const hasActiveSearch = normalizedQuery.length > 0;
  const visibleFacts = useMemo(() => (hasActiveSearch ? facts : facts.slice(0, 3)), [facts, hasActiveSearch]);

  const loadExplorer = useCallback(async (searchValue?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getExplorerData({ query: searchValue || undefined });
      setThemes(data.categories);
      setFacts(data.facts);
      setRecentFacts(data.recentFacts);
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

  function submitSearch() {
    const nextQuery = query.trim();
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
    <LinearGradient colors={["#07111f", "#101b2c", "#050812"]} style={styles.root}>
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["rgba(255,209,102,0.15)", "rgba(106,227,192,0.07)", "rgba(255,255,255,0.045)"]}
        style={styles.heroPanel}
      >
        <View>
          <Text style={styles.eyebrow}>Explorer</Text>
          <Text style={styles.title}>Trouve le fait qui va te rester en tête.</Text>
        </View>

        <View style={styles.searchBox}>
          <Search color="rgba(248,250,252,0.62)" size={20} strokeWidth={2.2} />
          <TextInput
            autoCapitalize="none"
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            placeholder="Océan, NASA, cerveau..."
            placeholderTextColor="rgba(248,250,252,0.42)"
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          <Pressable accessibilityRole="button" onPress={submitSearch} style={styles.searchButton}>
            <Text style={styles.searchButtonText}>OK</Text>
          </Pressable>
        </View>
      </LinearGradient>

      {isLoading ? (
        <LoadingState label="Recherche en cours..." />
      ) : (
        <>
          <SectionTitle label={hasActiveSearch ? `Résultats pour “${submittedQuery}”` : "À découvrir"} />
          {visibleFacts.length > 0 ? (
            <View style={styles.factList}>
              {visibleFacts.map((fact) => (
                <FactRow fact={fact} key={fact.id} onPress={() => onOpenFact(fact)} />
              ))}
            </View>
          ) : (
            <NoResultBanner onClear={clearSearch} onOpenDiscover={onOpenDiscover} />
          )}

          {!hasActiveSearch ? (
            <>
              <SectionTitle label="Thèmes" />
              {themes.length > 0 ? (
                <View style={styles.themeGrid}>
                  {themes.slice(0, 8).map((theme) => (
                    <ThemeTile key={theme.id} theme={theme} />
                  ))}
                </View>
              ) : (
                <EmptyText>Aucun thème trouvé.</EmptyText>
              )}
            </>
          ) : null}

          {!hasActiveSearch && recentFacts.length > 0 ? (
            <>
              <SectionTitle label="Récemment ajoutés" />
              <View style={styles.factList}>
                {recentFacts.slice(0, 5).map((fact) => (
                  <FactRow fact={fact} key={fact.id} compact onPress={() => onOpenFact(fact)} />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
    </LinearGradient>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function EmptyText({ children }: { children: string }) {
  return <Text style={styles.empty}>{children}</Text>;
}

function NoResultBanner({
  onClear,
  onOpenDiscover,
}: {
  onClear: () => void;
  onOpenDiscover: () => void;
}) {
  return (
    <View style={styles.noResult}>
      <Text style={styles.noResultKicker}>Aucun résultat</Text>
      <Text style={styles.noResultTitle}>Aucun fait ne correspond à cette recherche.</Text>
      <Text style={styles.noResultText}>
        Repars des thèmes ou ouvre le flux pour tomber sur une nouvelle découverte.
      </Text>
      <View style={styles.noResultActions}>
        <Pressable onPress={onClear} style={styles.secondaryAction}>
          <Text style={styles.secondaryActionText}>Voir les thèmes</Text>
        </Pressable>
        <Pressable onPress={onOpenDiscover} style={styles.primaryAction}>
          <Text style={styles.primaryActionText}>Voir les faits</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FactRow({ compact = false, fact, onPress }: { compact?: boolean; fact: FeedFact; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.factRow, pressed && styles.pressed]}>
      <View style={styles.factMeta}>
        <Text style={[styles.category, { color: fact.accent }]} numberOfLines={1}>
          {fact.category}
        </Text>
        <Text style={styles.source} numberOfLines={1}>
          {fact.source}
        </Text>
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

function ThemeTile({ theme }: { theme: CategorySummary }) {
  return (
    <LinearGradient colors={["#07111f", theme.accent, "#050812"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.themeTile}>
      <View style={styles.themeScrim} />
      <Text style={styles.themeName} numberOfLines={2}>
        {theme.name}
      </Text>
      <Text style={styles.themeCount}>{theme.count ?? 0} faits</Text>
    </LinearGradient>
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
  content: {
    gap: 20,
    paddingBottom: 28,
    paddingHorizontal: 18,
  },
  empty: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    padding: 16,
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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
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
  pressed: {
    opacity: 0.74,
  },
  heroPanel: {
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    overflow: "hidden",
    padding: 18,
  },
  noResult: {
    backgroundColor: "rgba(255,255,255,0.065)",
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  noResultActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
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
  primaryAction: {
    backgroundColor: colors.accent,
    borderRadius: 15,
    minHeight: 44,
    paddingHorizontal: 15,
    justifyContent: "center",
  },
  primaryActionText: {
    color: "#06111d",
    fontSize: 13,
    fontWeight: "900",
  },
  root: {
    flex: 1,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "rgba(5,8,18,0.42)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    minWidth: 46,
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
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 6,
  },
  source: {
    color: "rgba(248,250,252,0.42)",
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
    maxWidth: "44%",
  },
  secondaryAction: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 15,
  },
  secondaryActionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  themeCount: {
    color: "rgba(248,250,252,0.68)",
    fontSize: 12,
    fontWeight: "800",
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  themeName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 23,
  },
  themeScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  themeTile: {
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 18,
    justifyContent: "space-between",
    minHeight: 138,
    overflow: "hidden",
    padding: 16,
    width: "48%",
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 38,
    marginTop: 8,
  },
});
