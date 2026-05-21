import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, Share2 } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FactDetailView } from "../components/FactDetailView";
import { LoadingState, ScreenState } from "../components/ScreenState";
import { GrummButton } from "../components/GrummButton";
import { userMessages } from "../config/app";
import { useAuth } from "../context/AuthContext";
import { getFactActions, getSavedFacts, toggleLike, toggleSave } from "../lib/facts";
import { useFactImageShare } from "../lib/share";
import { colors } from "../theme/colors";
import type { FactActions, FeedFact } from "../types/domain";

type SavedScreenProps = {
  onRequireAuth: () => void;
};

export function SavedScreen({ onRequireAuth }: SavedScreenProps) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { shareFactImage, shareStoryNode } = useFactImageShare();
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [actions, setActions] = useState<Record<string, FactActions>>({});
  const [selectedFact, setSelectedFact] = useState<FeedFact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSavedFacts = useCallback(async () => {
    if (!session) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextFacts = await getSavedFacts();
      const nextActions = await getFactActions(nextFacts.map((fact) => fact.id));
      const mappedActions: Record<string, FactActions> = {};
      nextActions.forEach((value, key) => {
        mappedActions[key] = { ...value, saved: true };
      });
      setFacts(nextFacts);
      setActions(mappedActions);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : userMessages.genericLoadError);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      loadSavedFacts();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadSavedFacts]);

  async function handleToggleLike(fact: FeedFact) {
    const current = actions[fact.id] ?? { liked: false, saved: true };
    setActions((value) => ({ ...value, [fact.id]: { ...current, liked: !current.liked } }));

    try {
      await toggleLike(fact.id, current.liked);
      await Haptics.selectionAsync();
    } catch {
      setActions((value) => ({ ...value, [fact.id]: current }));
    }
  }

  async function handleToggleSave(fact: FeedFact) {
    const current = actions[fact.id] ?? { liked: false, saved: true };
    setActions((value) => ({ ...value, [fact.id]: { ...current, saved: !current.saved } }));

    try {
      await toggleSave(fact.id, current.saved);
      await Haptics.selectionAsync();

      if (current.saved) {
        setFacts((items) => items.filter((item) => item.id !== fact.id));
      }
    } catch {
      setActions((value) => ({ ...value, [fact.id]: current }));
    }
  }

  if (!session) {
    return (
      <ScreenState
        actionLabel="Se connecter"
        message="Tes faits enregistrés seront disponibles sur tous tes appareils."
        onAction={onRequireAuth}
        title="Enregistre tes découvertes"
      />
    );
  }

  if (selectedFact) {
    return (
      <>
      <FactDetailView
        actions={actions[selectedFact.id] ?? { liked: false, saved: true }}
        fact={selectedFact}
        onBack={() => setSelectedFact(null)}
        onShare={() => void shareFactImage(selectedFact)}
        onToggleLike={() => void handleToggleLike(selectedFact)}
        onToggleSave={() => void handleToggleSave(selectedFact)}
      />
      {shareStoryNode}
      </>
    );
  }

  if (isLoading) {
    return <LoadingState label="Chargement des faits enregistrés..." />;
  }

  if (error) {
    return <ScreenState actionLabel="Réessayer" message={error} onAction={loadSavedFacts} title="Chargement impossible" />;
  }

  if (facts.length === 0) {
    return (
      <ScreenState
        message="Les faits que tu gardes apparaîtront ici, prêts à être relus."
        title="Rien à relire pour le moment"
      />
    );
  }

  return (
    <LinearGradient colors={["#07111f", "#101b2c", "#050812"]} style={[styles.wrap, { paddingTop: insets.top + 18 }]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Bibliothèque</Text>
        <Text style={styles.title}>Enregistrés</Text>
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={facts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => setSelectedFact(item)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
            <View style={styles.cardTop}>
              <Text style={[styles.category, { color: item.accent }]}>{item.category}</Text>
              <Bookmark color={colors.accent} fill={colors.accent} size={18} strokeWidth={2.2} />
            </View>
            <Text style={styles.cardTitle} numberOfLines={3}>
              {item.title}
            </Text>
            {item.hook ? (
              <Text style={styles.cardText} numberOfLines={3}>
                {item.hook}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <Pressable onPress={() => void shareFactImage(item)} style={styles.smallAction}>
                <Share2 color={colors.accent} size={16} strokeWidth={2.3} />
                <Text style={styles.smallActionText}>Partager</Text>
              </Pressable>
              <GrummButton
                onPress={() => void handleToggleSave(item)}
                style={styles.removeButton}
                variant="secondary"
              >
                Retirer
              </GrummButton>
            </View>
          </Pressable>
        )}
        showsVerticalScrollIndicator={false}
      />
      {shareStoryNode}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 18,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  cardText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: 8,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  category: {
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  header: {
    paddingHorizontal: 18,
  },
  list: {
    gap: 14,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  pressed: {
    opacity: 0.76,
  },
  removeButton: {
    minHeight: 44,
    minWidth: 116,
  },
  smallAction: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    minHeight: 44,
  },
  smallActionText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "800",
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 38,
    marginTop: 6,
  },
  wrap: {
    flex: 1,
  },
});
