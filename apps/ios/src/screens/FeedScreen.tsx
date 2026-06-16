import * as Haptics from "expo-haptics";
import { BookOpenText, RotateCcw } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  LayoutChangeEvent,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from "react-native";

import { AppScreen } from "../components/AppScreen";
import { EmptyState, LoadingState } from "../components/ScreenState";
import { FactCard } from "../components/FactCard";
import { mobileConfig, userMessages } from "../config/app";
import { useAuth } from "../context/AuthContext";
import { trackMobileAnalyticsEvent } from "../lib/analytics";
import {
  getFactActions,
  getFeedFacts,
  recordFactView,
  toggleLike,
  toggleSave,
} from "../lib/facts";
import { useFactImageShare } from "../lib/share";
import { appTheme } from "../theme/appTheme";
import type { FactActions, FeedFact } from "../types/domain";

type FeedScreenProps = {
  onClearTheme: () => void;
  onRequireAuth: () => void;
  onSystemBarChange?: (theme: FeedSystemBarTheme) => void;
  themeName?: string | null;
  themeSlug?: string | null;
};

export type FeedSystemBarTheme = {
  backgroundColor: string;
  style: "dark" | "light";
};

const defaultFeedSystemBarTheme: FeedSystemBarTheme = {
  backgroundColor: "#172033",
  style: "light",
};

function getTopFeedColor(fact?: FeedFact | null) {
  const hexColors = fact?.tone.match(/#[0-9a-fA-F]{3,8}/g);

  return hexColors?.[0] ?? defaultFeedSystemBarTheme.backgroundColor;
}

function getHexLuminance(hexColor: string) {
  const normalized = hexColor.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : normalized.slice(0, 6);

  if (expanded.length !== 6) {
    return 0;
  }

  const [r, g, b] = [0, 2, 4].map((start) => {
    const value = Number.parseInt(expanded.slice(start, start + 2), 16) / 255;

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getFeedSystemBarTheme(fact?: FeedFact | null): FeedSystemBarTheme {
  const backgroundColor = getTopFeedColor(fact);

  return {
    backgroundColor,
    style: getHexLuminance(backgroundColor) > 0.62 ? "dark" : "light",
  };
}

export function FeedScreen({
  onClearTheme,
  onRequireAuth,
  onSystemBarChange,
  themeSlug,
}: FeedScreenProps) {
  const { isLoading: isAuthLoading, profile, session } = useAuth();
  const { shareFactImage, shareStoryNode } = useFactImageShare();
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [actions, setActions] = useState<Record<string, FactActions>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemBarTheme, setSystemBarTheme] = useState<FeedSystemBarTheme>(
    defaultFeedSystemBarTheme,
  );
  const [viewportHeight, setViewportHeight] = useState(0);
  const recordedIds = useRef(new Set<string>());
  const inFlightLoadKeyRef = useRef<string | null>(null);
  const isLoadingMoreRef = useRef(false);
  const learningGoal = profile?.learningGoal;
  const dailyGoal = profile?.dailyGoal ?? mobileConfig.dailyGoal;
  const loadKey = `${session?.user.id ?? "anonymous"}:${learningGoal ?? "default"}:${themeSlug ?? "all"}`;

  const viewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 64 }), []);
  const applySystemBarTheme = useCallback(
    (fact?: FeedFact | null) => {
      const nextTheme = getFeedSystemBarTheme(fact);

      setSystemBarTheme((current) =>
        current.backgroundColor === nextTheme.backgroundColor &&
        current.style === nextTheme.style
          ? current
          : nextTheme,
      );
      onSystemBarChange?.(nextTheme);
    },
    [onSystemBarChange],
  );
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const fact = viewableItems[0]?.item as FeedFact | undefined;

    if (!fact || recordedIds.current.has(fact.id)) {
      if (fact) {
        applySystemBarTheme(fact);
      }
      return;
    }

    applySystemBarTheme(fact);
    recordedIds.current.add(fact.id);
    void trackMobileAnalyticsEvent({
      entityId: fact.id,
      entityType: "fact",
      eventName: "fact_viewed",
    });
    void recordFactView(fact.id, dailyGoal).catch(() => undefined);
  }, [applySystemBarTheme, dailyGoal]);

  const mergeActions = useCallback((nextActions: Map<string, FactActions>) => {
    setActions((current) => {
      const merged = { ...current };
      nextActions.forEach((value, key) => {
        merged[key] = value;
      });
      return merged;
    });
  }, []);

  const loadFeed = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (isAuthLoading) {
        return;
      }

      const requestKey = `${mode}:${loadKey}`;

      if (mode === "initial" && inFlightLoadKeyRef.current === requestKey) {
        return;
      }

      inFlightLoadKeyRef.current = requestKey;

      if (mode === "refresh") {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      recordedIds.current = new Set();

      try {
        const nextFacts = await getFeedFacts({
          learningGoal,
          limit: mobileConfig.feedBatchSize,
          themeSlug,
          userId: session?.user.id ?? null,
        });
        setFacts(nextFacts);
        setExpandedIds(new Set());
        void getFactActions(nextFacts.map((fact) => fact.id))
          .then(mergeActions)
          .catch(() => undefined);
      } catch (nextError) {
        setError((currentError) => currentError ?? (nextError instanceof Error ? nextError.message : userMessages.genericLoadError));
      } finally {
        if (inFlightLoadKeyRef.current === requestKey) {
          inFlightLoadKeyRef.current = null;
        }
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAuthLoading, learningGoal, loadKey, mergeActions, session?.user.id, themeSlug],
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMoreRef.current || isLoadingMore || facts.length === 0) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const nextFacts = await getFeedFacts({
        excludeIds: facts.map((fact) => fact.id),
        learningGoal,
        limit: mobileConfig.feedBatchSize,
        themeSlug,
        userId: session?.user.id ?? null,
      });

      if (nextFacts.length > 0) {
        setFacts((current) => [...current, ...nextFacts]);
        void getFactActions(nextFacts.map((fact) => fact.id))
          .then(mergeActions)
          .catch(() => undefined);
      }
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [facts, isLoadingMore, learningGoal, mergeActions, session?.user.id, themeSlug]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      void loadFeed();
    });

    return () => cancelAnimationFrame(frame);
  }, [isAuthLoading, loadFeed]);

  useEffect(() => {
    applySystemBarTheme(facts[0] ?? null);
  }, [applySystemBarTheme, facts]);

  async function handleToggleLike(fact: FeedFact) {
    if (!session) {
      onRequireAuth();
      return;
    }

    const current = actions[fact.id] ?? { liked: false, saved: false };
    setActions((value) => ({ ...value, [fact.id]: { ...current, liked: !current.liked } }));

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
    if (!session) {
      onRequireAuth();
      return;
    }

    const current = actions[fact.id] ?? { liked: false, saved: false };
    setActions((value) => ({ ...value, [fact.id]: { ...current, saved: !current.saved } }));

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

  function toggleExpanded(factId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(factId)) {
        next.delete(factId);
      } else {
        next.add(factId);
      }
      return next;
    });
  }

  function handleViewportLayout(event: LayoutChangeEvent) {
    setViewportHeight(Math.max(1, Math.round(event.nativeEvent.layout.height)));
  }

  if (isAuthLoading || isLoading) {
    return (
      <AppScreen>
        <LoadingState label="Chargement du feed..." />
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
          onAction={() => void loadFeed()}
          title="Feed indisponible"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentStyle={styles.screen} topSafeAreaColor={systemBarTheme.backgroundColor}>
      <View onLayout={handleViewportLayout} style={styles.viewport}>
        <FlatList
        ListEmptyComponent={
          <EmptyState
            Icon={BookOpenText}
            actionLabel={themeSlug ? "Tous les faits" : "Actualiser"}
            message={themeSlug ? "Aucun fait pour ce thème pour le moment." : userMessages.emptyFeed}
            onAction={themeSlug ? onClearTheme : () => void loadFeed()}
            title="Rien à lire"
          />
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <Text style={styles.footerLoaderText}>Encore quelques faits...</Text>
            </View>
          ) : null
        }
        contentContainerStyle={facts.length === 0 ? styles.emptyListContent : undefined}
        data={facts}
        decelerationRate="fast"
        keyExtractor={(item, index) => `${item.id}:${index}`}
        onEndReached={loadMore}
        onEndReachedThreshold={0.45}
        onViewableItemsChanged={onViewableItemsChanged}
        pagingEnabled
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={appTheme.color.teal}
            onRefresh={() => void loadFeed("refresh")}
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.factPage, { height: viewportHeight || undefined }]}>
            <FactCard
              actions={actions[item.id] ?? { liked: false, saved: false }}
              expanded={expandedIds.has(item.id)}
              fact={item}
              immersive
              onReadMore={() => toggleExpanded(item.id)}
              onShare={() => {
                void trackMobileAnalyticsEvent({
                  entityId: item.id,
                  entityType: "fact",
                  eventName: "fact_shared",
                });
                void shareFactImage(item);
              }}
              onSourcePress={() => {
                void trackMobileAnalyticsEvent({
                  entityId: item.id,
                  entityType: "fact",
                  eventName: "source_clicked",
                });
              }}
              onToggleLike={() => void handleToggleLike(item)}
              onToggleSave={() => void handleToggleSave(item)}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={viewportHeight || undefined}
        viewabilityConfig={viewabilityConfig}
      />
      </View>
      {shareStoryNode}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  footerLoader: {
    alignItems: "center",
    padding: 18,
  },
  footerLoaderText: {
    color: appTheme.color.muted,
    fontSize: 13,
    fontWeight: appTheme.weight.semibold,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  factPage: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 0,
  },
  viewport: {
    flex: 1,
  },
});
