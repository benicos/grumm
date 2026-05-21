import { LinearGradient } from "expo-linear-gradient";
import { Search } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingState, ScreenState } from "../components/ScreenState";
import { userMessages } from "../config/app";
import { getExplorerData } from "../lib/facts";
import { colors } from "../theme/colors";
import type { CategorySummary, FeedFact } from "../types/domain";

type ExploreScreenProps = {
  onOpenFact: (fact: FeedFact) => void;
};

export function ExploreScreen({ onOpenFact }: ExploreScreenProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [themes, setThemes] = useState<CategorySummary[]>([]);
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [recentFacts, setRecentFacts] = useState<FeedFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const normalizedQuery = query.trim();
  const visibleFacts = useMemo(() => (normalizedQuery ? facts : facts.slice(0, 3)), [facts, normalizedQuery]);

  const loadExplorer = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getExplorerData({ query: normalizedQuery || undefined });
      setThemes(data.categories);
      setFacts(data.facts);
      setRecentFacts(data.recentFacts);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : userMessages.genericLoadError);
    } finally {
      setIsLoading(false);
    }
  }, [normalizedQuery]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadExplorer();
    }, normalizedQuery ? 260 : 0);

    return () => clearTimeout(timeout);
  }, [loadExplorer, normalizedQuery]);

  if (error && !isLoading) {
    return <ScreenState actionLabel="Réessayer" message={error} onAction={loadExplorer} title="Explorer est indisponible" />;
  }

  return (
    <LinearGradient colors={["#050812", "#07111f", "#101b2c"]} style={styles.root}>
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
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
          placeholder="Océan, NASA, cerveau..."
          placeholderTextColor="rgba(248,250,252,0.42)"
          style={styles.searchInput}
          value={query}
        />
      </View>

      {isLoading ? (
        <LoadingState label="Recherche en cours..." />
      ) : (
        <>
          <SectionTitle label={normalizedQuery ? "Résultats" : "À découvrir"} />
          {visibleFacts.length > 0 ? (
            <View style={styles.factList}>
              {visibleFacts.map((fact) => (
                <FactRow fact={fact} key={fact.id} onPress={() => onOpenFact(fact)} />
              ))}
            </View>
          ) : (
            <EmptyText>Aucun fait ne correspond à cette recherche.</EmptyText>
          )}

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

          {!normalizedQuery && recentFacts.length > 0 ? (
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
    gap: 18,
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
    backgroundColor: "rgba(255,255,255,0.035)",
    borderBottomColor: "rgba(255,255,255,0.12)",
    borderBottomWidth: 1,
    paddingHorizontal: 2,
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
  root: {
    flex: 1,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.075)",
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
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
