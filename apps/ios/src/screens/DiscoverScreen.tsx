import * as Haptics from "expo-haptics";
import { Flame } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, AppState, FlatList, InteractionManager, Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type ViewToken } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FactCard } from "../components/FactCard";
import { FactDetailView } from "../components/FactDetailView";
import { GoalCelebration } from "../components/GoalCelebration";
import { LoadingState, ScreenState } from "../components/ScreenState";
import { mobileConfig, userMessages } from "../config/app";
import { useAuth } from "../context/AuthContext";
import {
  finishMobileFactRead,
  markMobileFactReadInteraction,
  startMobileFactRead,
  trackMobileAnalyticsEvent,
  type MobileFactReadToken,
} from "../lib/analytics";
import { isCommercialCollaborationFact } from "../lib/commercial";
import { getFactActions, getFeedFacts, getTodayDailyProgress, recordFactView, toggleLike, toggleSave } from "../lib/facts";
import { useFactImageShare } from "../lib/share";
import { colors } from "../theme/colors";
import type { FactActions, FeedFact } from "../types/domain";

type DiscoverScreenProps = {
  initialFact?: FeedFact | null;
  onRequireAuth: () => void;
  themeSlug?: string | null;
};

export function DiscoverScreen({ initialFact, onRequireAuth, themeSlug }: DiscoverScreenProps) {
  const { profile, session } = useAuth();
  const { shareFactImage, shareStoryNode } = useFactImageShare();
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [actions, setActions] = useState<Record<string, FactActions>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialFact);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [screenHeight, setScreenHeight] = useState(0);
  const [goalCelebration, setGoalCelebration] = useState<{
    completedGoals: number;
    message: string;
    visible: boolean;
  }>({ completedGoals: 0, message: "Premier pas.", visible: false });
  const [selectedFact, setSelectedFact] = useState<FeedFact | null>(null);
  const recordedIds = useRef(new Set<string>());
  const celebrationShownRef = useRef(false);
  const factReadTokenRef = useRef<MobileFactReadToken | null>(null);
  const cardHeight = Math.max(560, screenHeight);
  const initialFactId = initialFact?.id ?? null;
  const activeFactId = facts[currentIndex]?.id ?? null;
  const learningGoal = profile?.learningGoal;

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 72 }), []);
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visibleIndex = viewableItems[0]?.index;

    if (typeof visibleIndex === "number") {
      setCurrentIndex(visibleIndex);
    }
  }, []);

  const mergeActions = useCallback((nextActions: Map<string, FactActions>) => {
    setActions((current) => {
      const merged = { ...current };
      nextActions.forEach((value, key) => {
        merged[key] = value;
      });
      return merged;
    });
  }, []);

  const loadInitial = useCallback(async () => {
    if (initialFact) {
      setFacts([initialFact]);
      setCurrentIndex(0);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    setError(null);
    recordedIds.current = new Set<string>();
    celebrationShownRef.current = false;

    try {
      const nextFacts = await getFeedFacts({
        excludeIds: initialFact ? [initialFact.id] : [],
        learningGoal,
        limit: mobileConfig.feedBatchSize,
        themeSlug,
      });
      const mergedFacts = initialFact
        ? [initialFact, ...nextFacts.filter((fact) => fact.id !== initialFact.id)]
        : nextFacts;
      const standardFactIds = mergedFacts
        .filter((fact) => !isCommercialCollaborationFact(fact))
        .map((fact) => fact.id);
      setFacts(mergedFacts);
      setCurrentIndex(0);
      InteractionManager.runAfterInteractions(() => {
        void getFactActions(standardFactIds)
          .then(mergeActions)
          .catch(() => undefined);
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : userMessages.genericLoadError);
    } finally {
      setIsLoading(false);
    }
  }, [initialFact, learningGoal, mergeActions, themeSlug]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || facts.length === 0) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const nextFacts = await getFeedFacts({
        excludeIds: facts.map((fact) => fact.id),
        learningGoal,
        limit: mobileConfig.feedBatchSize,
        themeSlug,
      });
      const recycledFacts =
        nextFacts.length > 0
          ? nextFacts
          : await getFeedFacts({
              excludeIds: [],
              learningGoal,
              limit: mobileConfig.feedBatchSize,
              themeSlug,
            });
      const uniqueFacts = recycledFacts.filter((fact) => !facts.some((current) => current.id === fact.id));
      const factsToAppend = uniqueFacts.length > 0 ? uniqueFacts : recycledFacts;
      const standardFactIds = factsToAppend
        .filter((fact) => !isCommercialCollaborationFact(fact))
        .map((fact) => fact.id);
      setFacts((current) => [...current, ...factsToAppend]);
      InteractionManager.runAfterInteractions(() => {
        void getFactActions(standardFactIds)
          .then(mergeActions)
          .catch(() => undefined);
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [facts, isLoadingMore, learningGoal, mergeActions, themeSlug]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      loadInitial();
    });

    return () => cancelAnimationFrame(frame);
  }, [initialFactId, loadInitial, session?.user.id, themeSlug]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      void getTodayDailyProgress(profile?.dailyGoal)
        .then((result) => {
          if (result.ok) {
            setTodayCount(result.viewedTodayCount);
          }
        })
        .catch(() => undefined);
    });

    return () => task.cancel();
  }, [profile?.dailyGoal, session]);

  useEffect(() => {
    const fact = activeFactId ? facts.find((item) => item.id === activeFactId) : null;

    if (
      !fact ||
      isCommercialCollaborationFact(fact) ||
      recordedIds.current.has(fact.id)
    ) {
      return;
    }

    recordedIds.current.add(fact.id);
    const task = InteractionManager.runAfterInteractions(() => {
      void recordFactView(fact.id, profile?.dailyGoal).then(async (result) => {
        if (!result.ok) {
          return;
        }

        setTodayCount(result.viewedTodayCount);

        if (!result.completedToday || celebrationShownRef.current) {
          return;
        }

        celebrationShownRef.current = true;
        setGoalCelebration({
          completedGoals: result.completedDailyGoals,
          message: result.message,
          visible: true,
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => {
          setGoalCelebration((current) => ({ ...current, visible: false }));
        }, 1900);
      })
      .catch(() => undefined);

    });

    return () => task.cancel();
  }, [activeFactId, facts, profile?.dailyGoal]);

  useEffect(() => {
    let cancelled = false;

    void finishMobileFactRead(factReadTokenRef.current);
    factReadTokenRef.current = null;

    const activeFact = activeFactId ? facts.find((fact) => fact.id === activeFactId) : null;

    if (!activeFactId || (activeFact && isCommercialCollaborationFact(activeFact))) {
      return () => {
        cancelled = true;
      };
    }

    const task = InteractionManager.runAfterInteractions(() => {
      void startMobileFactRead(activeFactId).then((token) => {
        if (cancelled) {
          void finishMobileFactRead(token);
          return;
        }

        factReadTokenRef.current = token;
      })
      .catch(() => undefined);
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [activeFactId, facts]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        void finishMobileFactRead(factReadTokenRef.current);
        factReadTokenRef.current = null;
      }
    });

    return () => {
      subscription.remove();
      void finishMobileFactRead(factReadTokenRef.current);
      factReadTokenRef.current = null;
    };
  }, []);

  async function handleToggleLike(fact: FeedFact) {
    if (isCommercialCollaborationFact(fact)) {
      return;
    }

    if (!session) {
      onRequireAuth();
      return;
    }

    const current = actions[fact.id] ?? { liked: false, saved: false };
    setActions((value) => ({ ...value, [fact.id]: { ...current, liked: !current.liked } }));
    markMobileFactReadInteraction(factReadTokenRef.current);

    try {
      await toggleLike(fact.id, current.liked);
      if (!current.liked) {
        void trackMobileAnalyticsEvent({
          entityId: fact.id,
          entityType: "fact",
          eventName: "fact_liked",
        });
      }
      await Haptics.selectionAsync();
    } catch {
      setActions((value) => ({ ...value, [fact.id]: current }));
    }
  }

  async function handleToggleSave(fact: FeedFact) {
    if (isCommercialCollaborationFact(fact)) {
      return;
    }

    if (!session) {
      onRequireAuth();
      return;
    }

    const current = actions[fact.id] ?? { liked: false, saved: false };
    setActions((value) => ({ ...value, [fact.id]: { ...current, saved: !current.saved } }));
    markMobileFactReadInteraction(factReadTokenRef.current);

    try {
      await toggleSave(fact.id, current.saved);
      if (!current.saved) {
        void trackMobileAnalyticsEvent({
          entityId: fact.id,
          entityType: "fact",
          eventName: "fact_saved",
        });
      }
      await Haptics.selectionAsync();
    } catch {
      setActions((value) => ({ ...value, [fact.id]: current }));
    }
  }

  function handleLayout(event: LayoutChangeEvent) {
    setScreenHeight(event.nativeEvent.layout.height);
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ScreenState actionLabel="Réessayer" message={error} onAction={loadInitial} title="Découvrir est indisponible" />;
  }

  if (facts.length === 0) {
    return <ScreenState actionLabel="Actualiser" message={userMessages.emptyFeed} onAction={loadInitial} title="Aucun fait disponible" />;
  }

  if (selectedFact) {
    return (
      <FactDetailView
        actions={actions[selectedFact.id] ?? { liked: false, saved: false }}
        fact={selectedFact}
        onBack={() => setSelectedFact(null)}
        onShare={() => {
          markMobileFactReadInteraction(factReadTokenRef.current);
          void shareFactImage(selectedFact);
        }}
        onToggleLike={() => void handleToggleLike(selectedFact)}
        onToggleSave={() => void handleToggleSave(selectedFact)}
      />
    );
  }

  return (
    <View onLayout={handleLayout} style={styles.wrap}>
      <FlatList
        data={facts}
        decelerationRate="fast"
        keyExtractor={(item, index) => `${item.id}:${index}`}
        onEndReached={loadMore}
        onEndReachedThreshold={0.55}
        onViewableItemsChanged={onViewableItemsChanged}
        pagingEnabled
        renderItem={({ item }) => (
          <FactCard
            actions={actions[item.id] ?? { liked: false, saved: false }}
            fact={item}
            height={cardHeight}
            onShare={() => {
              if (isCommercialCollaborationFact(item)) {
                return;
              }

              markMobileFactReadInteraction(factReadTokenRef.current);
              void trackMobileAnalyticsEvent({
                entityId: item.id,
                entityType: "fact",
                eventName: "fact_shared",
              });
              void shareFactImage(item);
            }}
            onSourcePress={() => {
              if (isCommercialCollaborationFact(item)) {
                return;
              }

              markMobileFactReadInteraction(factReadTokenRef.current);
              void trackMobileAnalyticsEvent({
                entityId: item.id,
                entityType: "fact",
                eventName: "source_clicked",
              });
            }}
            onToggleLike={() => void handleToggleLike(item)}
            onToggleSave={() => void handleToggleSave(item)}
            onView={() => {
              markMobileFactReadInteraction(factReadTokenRef.current);
              setSelectedFact(item);
            }}
          />
        )}
        showsVerticalScrollIndicator={false}
        snapToInterval={cardHeight}
        snapToAlignment="start"
        viewabilityConfig={viewabilityConfig}
      />
      <TodayCounter count={session ? todayCount : 0} onPress={!session ? onRequireAuth : undefined} />
      {shareStoryNode}
      <GoalCelebration
        completedGoals={goalCelebration.completedGoals}
        message={goalCelebration.message}
        visible={goalCelebration.visible}
      />
    </View>
  );
}

function TodayCounter({ count, onPress }: { count: number; onPress?: () => void }) {
  const insets = useSafeAreaInsets();
  const scale = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, {
        duration: 130,
        toValue: 1.08,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        duration: 220,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [count, scale]);

  return (
    <Animated.View style={[styles.todayCounter, { top: insets.top + 16, transform: [{ scale }] }]}>
      <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress} style={styles.todayPressable}>
      <Flame color={colors.accent} fill={colors.accent} size={16} strokeWidth={2.2} />
      <Text style={styles.todayText}>{count}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  todayCounter: {
    alignItems: "center",
    backgroundColor: "rgba(5,8,18,0.38)",
    borderColor: "rgba(255,209,102,0.24)",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    position: "absolute",
    right: 18,
    shadowColor: colors.accent,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    zIndex: 10,
  },
  todayText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  todayPressable: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  wrap: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
