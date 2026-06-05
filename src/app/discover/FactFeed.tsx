"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Inter } from "next/font/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { discoverConfig, userMessages } from "@/config/app";
import {
  finishFactRead,
  markFactReadInteraction,
  startFactRead,
  trackAnalyticsEvent,
  trackAnalyticsEventOnce,
  type FactReadToken,
} from "@/lib/analytics/web";
import { isCommercialCollaborationFact } from "@/lib/commercial";
import {
  DEFAULT_DAILY_GOAL,
  DISCOVER_FEED_BATCH_SIZE,
  cleanFactSource,
  getFeedFacts,
  getTodayDailyProgress,
  getUserFactActions,
  likeFact,
  recordFactView,
  saveFact,
  unlikeFact,
  unsaveFact,
} from "@/lib/facts";
import type { CategorySummary, FeedFact } from "@/lib/facts";
import { rememberAuthRedirect } from "@/lib/authRedirect";
import { getGoalCelebrationMessage } from "@/lib/badges";
import { logAppError } from "@/lib/errors";
import { getToneBackground } from "@/lib/gradients";
import { useAuth } from "../auth/AuthProvider";
import { AppState, FeedSkeleton } from "../components/AppState";
import FactSource from "../components/FactSource";
import FactShareModal from "../components/share/FactShareModal";
import Navbar from "../components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const confettiPieces = [
  { left: "22%", top: "24%", color: "#ffd166", delay: "0ms" },
  { left: "32%", top: "18%", color: "#6ae3c0", delay: "120ms" },
  { left: "44%", top: "23%", color: "#ffffff", delay: "220ms" },
  { left: "56%", top: "17%", color: "#ffb3bd", delay: "80ms" },
  { left: "68%", top: "25%", color: "#ffd166", delay: "180ms" },
  { left: "77%", top: "34%", color: "#6ae3c0", delay: "300ms" },
  { left: "27%", top: "62%", color: "#ffb3bd", delay: "260ms" },
  { left: "72%", top: "60%", color: "#ffffff", delay: "160ms" },
];

const celebrationBursts = [
  { left: "17%", top: "38%", size: "h-2 w-2", delay: "60ms" },
  { left: "26%", top: "28%", size: "h-1.5 w-1.5", delay: "180ms" },
  { left: "38%", top: "68%", size: "h-2.5 w-2.5", delay: "80ms" },
  { left: "58%", top: "30%", size: "h-2 w-2", delay: "140ms" },
  { left: "69%", top: "66%", size: "h-1.5 w-1.5", delay: "240ms" },
  { left: "82%", top: "42%", size: "h-2.5 w-2.5", delay: "110ms" },
];

const actionIcons = {
  like: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M12 20s-7-4.4-9.3-8.7C.9 7.8 3 4.4 6.6 4.4c2 0 3.3 1 4.1 2.1.8-1.1 2.2-2.1 4.2-2.1 3.5 0 5.7 3.4 3.8 6.9C19 15.6 12 20 12 20Z"
        fill="currentColor"
      />
    </svg>
  ),
  save: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M6 4.8C6 3.8 6.8 3 7.8 3h8.4c1 0 1.8.8 1.8 1.8V21l-6-3.7L6 21V4.8Z"
        fill="currentColor"
      />
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M17.5 15.1c-1.2 0-2.2.6-2.8 1.5L9.3 13.8c.1-.4.1-.7.1-1.1s0-.7-.1-1.1l5.3-2.8c.6.9 1.7 1.5 2.9 1.5 1.9 0 3.5-1.6 3.5-3.5S19.4 3.3 17.5 3.3 14 4.9 14 6.8v.3L8.5 10C7.9 9.4 7 9 6 9c-2 0-3.6 1.6-3.6 3.6S4 16.2 6 16.2c1 0 1.9-.4 2.5-1l5.5 2.9v.3c0 1.9 1.6 3.5 3.5 3.5s3.5-1.6 3.5-3.5-1.6-3.3-3.5-3.3Z"
        fill="currentColor"
      />
    </svg>
  ),
  view: (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M3 12s3.2-5.6 9-5.6S21 12 21 12s-3.2 5.6-9 5.6S3 12 3 12Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M12 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  ),
};

type FactFeedProps = {
  themeSlug?: string;
};

const RECENT_FEED_STORAGE_LIMIT = discoverConfig.recentFeedStorageLimit;

function getFeedStorageKey(scope: string) {
  return `grumm:recentFeedFacts:${scope}`;
}

function getFeedSessionStorageKey(scope: string) {
  return `grumm:feedSession:${scope}`;
}

function createFeedSessionId() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (value) =>
    (
      Number(value) ^
      (Math.random() * 16) >> (Number(value) / 4)
    ).toString(16),
  );
}

function getFeedSessionId(scope: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const key = getFeedSessionStorageKey(scope);
  const existing = window.sessionStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const sessionId = createFeedSessionId();
  window.sessionStorage.setItem(key, sessionId);

  return sessionId;
}

function getRememberedFactIds(scope: string) {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  try {
    const rawValue = window.sessionStorage.getItem(getFeedStorageKey(scope));
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];

    return Array.isArray(parsedValue)
      ? parsedValue.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function rememberFactIds(scope: string, factIds: string[]) {
  if (typeof window === "undefined" || factIds.length === 0) {
    return;
  }

  const existingIds = getRememberedFactIds(scope);
  const nextIds = [
    ...existingIds.filter((factId) => !factIds.includes(factId)),
    ...factIds,
  ].slice(-RECENT_FEED_STORAGE_LIMIT);

  try {
    window.sessionStorage.setItem(
      getFeedStorageKey(scope),
      JSON.stringify(nextIds),
    );
  } catch {
    // Session memory is only a feed quality hint.
  }
}

function clearRememberedFactIds(scope: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(getFeedStorageKey(scope));
  } catch {
    // Session memory is only a feed quality hint.
  }
}

function toggleAction(
  value: string,
  setter: Dispatch<SetStateAction<string[]>>,
) {
  setter((items) =>
    items.includes(value)
      ? items.filter((item) => item !== value)
      : [...items, value],
  );
}

export default function FactFeed({ themeSlug }: FactFeedProps) {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading: isLoadingAuth,
    profile,
    user,
  } = useAuth();
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [theme, setTheme] = useState<CategorySummary | null>(null);
  const [isUnknownTheme, setIsUnknownTheme] = useState(false);
  const [isLoadingFacts, setIsLoadingFacts] = useState(true);
  const [isLoadingMoreFacts, setIsLoadingMoreFacts] = useState(false);
  const [hasMoreFacts, setHasMoreFacts] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sharedFact, setSharedFact] = useState<FeedFact | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [dailyProgress, setDailyProgress] = useState({
    count: 0,
    goal: profile?.daily_goal ?? DEFAULT_DAILY_GOAL,
  });
  const [goalCelebrationMessage, setGoalCelebrationMessage] =
    useState("Premier pas.");
  const [showGoalAnimation, setShowGoalAnimation] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const wheelDeltaRef = useRef(0);
  const wheelLocked = useRef(false);
  const wheelResetTimer = useRef<number | null>(null);
  const reportedFactsRef = useRef(new Set<string>());
  const goalAnimationShownRef = useRef(false);
  const loadedFactIdsRef = useRef<string[]>([]);
  const feedRequestIdRef = useRef(0);
  const isMountedRef = useRef(false);
  const loadedResetKeyRef = useRef<string | null>(null);
  const factReadTokenRef = useRef<FactReadToken | null>(null);
  const hasSwipedRef = useRef(false);
  const swipeHintTimerRef = useRef<number | null>(null);

  const hasFacts = facts.length > 0;
  const activeFactIndex = hasFacts ? Math.min(currentStep, facts.length - 1) : 0;
  const activeFact = facts[activeFactIndex];
  const currentLearningGoal = profile?.learning_goal ?? null;
  const currentDailyGoal = profile?.daily_goal ?? dailyProgress.goal;
  const progress = useMemo(
    () =>
      Math.min(
        (dailyProgress.count / Math.max(currentDailyGoal, 1)) * 100,
        100,
      ),
    [currentDailyGoal, dailyProgress.count],
  );
  const visibleCards = hasFacts
    ? [-1, 0, 1].map((offset) => {
        const step = currentStep + offset;
        const fact = step >= 0 && step < facts.length ? facts[step] : null;

        return {
          fact,
          offset,
          step,
        };
      }).filter(
        (card): card is { fact: FeedFact; offset: number; step: number } =>
          Boolean(card.fact),
      )
    : [];

  const moveTo = useCallback((direction: 1 | -1) => {
    setCurrentStep((current) => {
      const maxStep = Math.max(facts.length - 1, 0);
      const nextStep = Math.max(current + direction, 0);

      const resolvedStep = Math.min(nextStep, maxStep);

      if (resolvedStep !== current) {
        hasSwipedRef.current = true;
        setShowSwipeHint(false);
      }

      return resolvedStep;
    });
    setDragOffset(0);
    dragOffsetRef.current = 0;
    setIsDragging(false);
  }, [facts.length]);

  const showTemporaryNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  }, []);

  const toggleRemoteAction = async (
    fact: FeedFact,
    isActive: boolean,
    setter: Dispatch<SetStateAction<string[]>>,
    enableAction: (factId: string) => Promise<{ ok: boolean }>,
    disableAction: (factId: string) => Promise<{ ok: boolean }>,
    analyticsEventName: "fact_like" | "fact_save",
  ) => {
    if (isCommercialCollaborationFact(fact)) {
      return;
    }

    const factId = fact.id;

    if (!isAuthenticated) {
      rememberAuthRedirect(window.location.pathname);
      showTemporaryNotice("Connecte-toi pour synchroniser cette action.");
      window.setTimeout(() => router.push("/login"), 450);
      return;
    }

    toggleAction(factId, setter);
    markFactReadInteraction(factReadTokenRef.current);

    try {
      const result = isActive
        ? await disableAction(factId)
        : await enableAction(factId);

      if (!result.ok) {
        toggleAction(factId, setter);
        rememberAuthRedirect(window.location.pathname);
        router.push("/login");
        return;
      }

      if (!isActive) {
        void trackAnalyticsEvent({
          entityId: factId,
          entityType: "fact",
          eventName: analyticsEventName,
        });
        void trackAnalyticsEventOnce(
          analyticsEventName === "fact_like" ? "first_like" : "first_save",
          {
            entityId: factId,
            entityType: "fact",
            eventName: analyticsEventName === "fact_like" ? "first_like" : "first_save",
          },
        );
      }
    } catch {
      toggleAction(factId, setter);
      showTemporaryNotice("Cette action n’a pas pu être synchronisée.");
    }
  };

  const openFactDetail = (fact: FeedFact) => {
    if (isCommercialCollaborationFact(fact)) {
      return;
    }

    markFactReadInteraction(factReadTokenRef.current);
    router.push(`/fait/${fact.slug || fact.id}`);
  };

  const shareFact = () => {
    if (!activeFact || isCommercialCollaborationFact(activeFact)) {
      return;
    }

    markFactReadInteraction(factReadTokenRef.current);
    void trackAnalyticsEvent({
      entityId: activeFact.id,
      entityType: "fact",
      eventName: "fact_shared",
    });
    setSharedFact(activeFact);
  };

  const loadFeedBatch = useCallback(
    async (mode: "append" | "reset") => {
      const isReset = mode === "reset";
      const scope = themeSlug ?? "all";
      const requestId = feedRequestIdRef.current + 1;
      feedRequestIdRef.current = requestId;

      if (isReset) {
        loadedFactIdsRef.current = [];
        hasSwipedRef.current = false;
        setShowSwipeHint(true);
        setHasMoreFacts(true);
        setIsUnknownTheme(false);
        setCurrentStep(0);
        setIsLoadingFacts(true);
      } else {
        setIsLoadingMoreFacts(true);
      }

      setFeedError(null);

      const rememberedFactIds = isReset ? getRememberedFactIds(scope) : [];
      const excludeIds = isReset
        ? rememberedFactIds
        : loadedFactIdsRef.current;

      try {
        const sessionId = getFeedSessionId(scope);
        let result = await getFeedFacts({
          excludeIds,
          learningGoal: currentLearningGoal,
          limit: DISCOVER_FEED_BATCH_SIZE,
          recentCategorySlugs: facts
            .slice(Math.max(currentStep - 5, 0), currentStep + 1)
            .map((fact) => fact.categorySlug),
          sessionId,
          themeSlug,
        });
        let recycledCycle = false;

        if (isReset && result.facts.length === 0 && rememberedFactIds.length > 0) {
          clearRememberedFactIds(scope);
          result = await getFeedFacts({
            excludeIds: [],
            learningGoal: currentLearningGoal,
            limit: DISCOVER_FEED_BATCH_SIZE,
            recentCategorySlugs: [],
            sessionId,
            themeSlug,
          });
        }

        if (!isReset && result.facts.length === 0 && loadedFactIdsRef.current.length > 0) {
          loadedFactIdsRef.current = [];
          recycledCycle = true;
          result = await getFeedFacts({
            excludeIds: [],
            learningGoal: currentLearningGoal,
            limit: DISCOVER_FEED_BATCH_SIZE,
            recentCategorySlugs: facts
              .slice(Math.max(currentStep - 5, 0), currentStep + 1)
              .map((fact) => fact.categorySlug),
            sessionId,
            themeSlug,
          });
        }

        if (!isMountedRef.current || requestId !== feedRequestIdRef.current) {
          return;
        }

        if (themeSlug && !result.theme) {
          setFacts([]);
          setTheme(null);
          setIsUnknownTheme(true);
          setHasMoreFacts(false);
          return;
        }

        const batchFacts = result.facts;
        const batchFactIds = batchFacts.map((fact) => fact.id);

        setFacts((currentFacts) => {
          if (isReset) {
            return batchFacts;
          }

          const existingIds = new Set(currentFacts.map((fact) => fact.id));
          const uniqueBatchFacts = batchFacts.filter(
            (fact) => !existingIds.has(fact.id),
          );

          if (uniqueBatchFacts.length > 0) {
            return [...currentFacts, ...uniqueBatchFacts];
          }

          return [
            ...currentFacts,
            ...batchFacts,
          ];
        });

        loadedFactIdsRef.current = isReset || recycledCycle
          ? batchFactIds
          : [
              ...loadedFactIdsRef.current,
              ...batchFactIds.filter(
                (factId) => !loadedFactIdsRef.current.includes(factId),
              ),
            ];
        rememberFactIds(scope, batchFactIds);
        setTheme(result.theme ?? null);
        setHasMoreFacts(batchFacts.length > 0);
      } catch (error) {
        if (isMountedRef.current && requestId === feedRequestIdRef.current) {
          if (isReset) {
            setFacts([]);
          }

          setFeedError(
            error instanceof Error
              ? error.message
              : "Découvrir est indisponible pour le moment.",
          );
        }
      } finally {
        if (isMountedRef.current && requestId === feedRequestIdRef.current) {
          if (isReset) {
            setIsLoadingFacts(false);
          } else {
            setIsLoadingMoreFacts(false);
          }
        }
      }
    },
    [currentLearningGoal, currentStep, facts, themeSlug],
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isLoadingAuth) {
      return;
    }

    const resetKey = `${themeSlug ?? "all"}:${user?.id ?? "anonymous"}:${currentLearningGoal ?? "default"}`;

    if (loadedResetKeyRef.current === resetKey) {
      return;
    }

    loadedResetKeyRef.current = resetKey;
    reportedFactsRef.current = new Set<string>();
    goalAnimationShownRef.current = false;

    queueMicrotask(() => {
      void loadFeedBatch("reset");
    });
  }, [
    isAuthenticated,
    isLoadingAuth,
    loadFeedBatch,
    currentLearningGoal,
    themeSlug,
    user?.id,
  ]);

  useEffect(() => {
    if (
      isLoadingFacts ||
      isLoadingMoreFacts ||
      !hasMoreFacts ||
      facts.length === 0 ||
      facts.length - activeFactIndex > 5
    ) {
      return;
    }

    queueMicrotask(() => {
      void loadFeedBatch("append");
    });
  }, [
    activeFactIndex,
    facts.length,
    hasMoreFacts,
    isLoadingFacts,
    isLoadingMoreFacts,
    loadFeedBatch,
  ]);

  useEffect(() => {
    let isMounted = true;

    async function loadUserActions() {
      if (isLoadingAuth) {
        return;
      }

      if (!isAuthenticated) {
        setLiked([]);
        setSaved([]);
        return;
      }

      try {
        const actions = await getUserFactActions(
          facts
            .filter((fact) => !isCommercialCollaborationFact(fact))
            .map((fact) => fact.id),
        );

        if (isMounted) {
          setLiked(actions.liked);
          setSaved(actions.saved);
        }
      } catch (error) {
        logAppError(error, {
          operation: "load user fact actions",
          source: "Supabase",
        });
      }
    }

    loadUserActions();

    return () => {
      isMounted = false;
    };
  }, [facts, isAuthenticated, isLoadingAuth]);

  useEffect(() => {
    let isMounted = true;

    async function loadDailyProgress() {
      if (isLoadingAuth) {
        return;
      }

      if (!isAuthenticated) {
        setDailyProgress({
          count: 0,
          goal: profile?.daily_goal ?? DEFAULT_DAILY_GOAL,
        });
        reportedFactsRef.current = new Set<string>();
        goalAnimationShownRef.current = false;
        return;
      }

      try {
        const result = await getTodayDailyProgress(
          profile?.daily_goal ?? DEFAULT_DAILY_GOAL,
        );

        if (isMounted && result.ok) {
          setDailyProgress((current) => ({
            count: Math.max(current.count, result.viewedTodayCount),
            goal: result.dailyGoal,
          }));
        }
      } catch (error) {
        logAppError(error, {
          operation: "load daily progress",
          source: "Supabase",
        });
      }
    }

    loadDailyProgress();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isLoadingAuth, profile?.daily_goal]);

  useEffect(() => {
    if (
      isLoadingAuth ||
      !isAuthenticated ||
      !activeFact?.id ||
      isCommercialCollaborationFact(activeFact) ||
      reportedFactsRef.current.has(activeFact.id)
    ) {
      return;
    }

    reportedFactsRef.current.add(activeFact.id);

    recordFactView(activeFact.id, profile?.daily_goal ?? DEFAULT_DAILY_GOAL)
      .then((result) => {
        if (!result.ok) {
          return;
        }

        setDailyProgress((current) => ({
          count: Math.max(current.count, result.viewedTodayCount),
          goal: result.dailyGoal,
        }));

        if (result.completedToday && !goalAnimationShownRef.current) {
          void trackAnalyticsEvent({
            eventName: "daily_goal_completed",
            metadata: {
              daily_goal: result.dailyGoal,
              facts_read_count: result.viewedTodayCount,
            },
          });
          goalAnimationShownRef.current = true;
          setGoalCelebrationMessage(
            getGoalCelebrationMessage(result.completedDailyGoals),
          );
          setShowGoalAnimation(true);
          window.setTimeout(() => setShowGoalAnimation(false), 3600);
        }
      })
      .catch(() => undefined);
  }, [activeFact, isAuthenticated, isLoadingAuth, profile?.daily_goal]);

  useEffect(() => {
    let cancelled = false;
    const previousToken = factReadTokenRef.current;

    factReadTokenRef.current = null;
    void finishFactRead(previousToken, { reason: "swipe" });

    if (
      isLoadingAuth ||
      !activeFact?.id ||
      isLoadingFacts ||
      isCommercialCollaborationFact(activeFact)
    ) {
      return () => {
        cancelled = true;
      };
    }

    startFactRead(activeFact.id)
      .then((token) => {
        if (cancelled) {
          void finishFactRead(token);
          return;
        }

        factReadTokenRef.current = token;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [activeFact, isLoadingAuth, isLoadingFacts]);

  useEffect(() => {
    if (swipeHintTimerRef.current !== null) {
      window.clearTimeout(swipeHintTimerRef.current);
      swipeHintTimerRef.current = null;
    }

    if (!hasSwipedRef.current || isLoadingFacts || !activeFact?.id) {
      return;
    }

    setShowSwipeHint(false);
    swipeHintTimerRef.current = window.setTimeout(() => {
      setShowSwipeHint(true);
      swipeHintTimerRef.current = null;
    }, 10000);

    return () => {
      if (swipeHintTimerRef.current !== null) {
        window.clearTimeout(swipeHintTimerRef.current);
        swipeHintTimerRef.current = null;
      }
    };
  }, [activeFact?.id, isLoadingFacts]);

  useEffect(() => {
    const handleHidden = () => {
      if (document.visibilityState === "hidden") {
        void finishFactRead(factReadTokenRef.current, { reason: "exit" });
        factReadTokenRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleHidden);

    return () => {
      document.removeEventListener("visibilitychange", handleHidden);
      void finishFactRead(factReadTokenRef.current, { reason: "exit" });
      factReadTokenRef.current = null;
    };
  }, []);

  useEffect(() => {
    const resetWheelDelta = () => {
      wheelDeltaRef.current = 0;
      wheelResetTimer.current = null;
    };

    const handleWheel = (event: WheelEvent) => {
      if (wheelLocked.current) {
        return;
      }

      wheelDeltaRef.current += event.deltaY;

      if (wheelResetTimer.current !== null) {
        window.clearTimeout(wheelResetTimer.current);
      }

      wheelResetTimer.current = window.setTimeout(resetWheelDelta, 180);

      if (Math.abs(wheelDeltaRef.current) < 68) {
        return;
      }

      const direction = wheelDeltaRef.current > 0 ? 1 : -1;
      wheelDeltaRef.current = 0;
      wheelLocked.current = true;
      moveTo(direction);

      window.setTimeout(() => {
        wheelLocked.current = false;
      }, 940);
    };

    window.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      window.removeEventListener("wheel", handleWheel);

      if (wheelResetTimer.current !== null) {
        window.clearTimeout(wheelResetTimer.current);
      }
    };
  }, [moveTo]);

  if (isUnknownTheme) {
    return (
      <AppState
        eyebrow="Thème introuvable"
        title="Ce thème n’existe pas encore."
        description="Ce lien ne correspond à aucun thème visible."
        primaryHref="/theme"
        primaryLabel="Explorer les thèmes"
        secondaryHref="/decouvrir"
        secondaryLabel="Découvrir"
      />
    );
  }

  if (feedError && !isLoadingFacts) {
    return (
      <AppState
        eyebrow="Découvrir indisponible"
        title="Les faits ne peuvent pas être chargés."
        description={feedError}
        primaryHref="/decouvrir"
        primaryLabel="Recharger Découvrir"
        secondaryHref="/theme"
        secondaryLabel="Explorer"
      />
    );
  }

  return (
    <main
      className={`${inter.className} min-h-screen overflow-hidden bg-[#132338] text-white`}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "PageDown") {
          moveTo(1);
        }

        if (event.key === "ArrowUp" || event.key === "PageUp") {
          moveTo(-1);
        }
      }}
      tabIndex={0}
    >
      <Navbar fixed />

      {notice && (
        <div className="fixed left-1/2 top-28 z-40 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/76 backdrop-blur-xl">
          {notice}
        </div>
      )}

      <section
        className="relative h-screen touch-none select-none"
        onTouchStart={(event) => {
          touchStartY.current = event.touches[0].clientY;
          setIsDragging(true);
        }}
        onTouchMove={(event) => {
          if (touchStartY.current === null) {
            return;
          }

          const nextOffset = event.touches[0].clientY - touchStartY.current;
          const easedOffset =
            Math.sign(nextOffset) * Math.sqrt(Math.abs(nextOffset)) * 12;
          dragOffsetRef.current = Math.max(Math.min(easedOffset, 160), -160);
          setDragOffset(dragOffsetRef.current);
        }}
        onTouchEnd={() => {
          const finalOffset = dragOffsetRef.current;

          if (finalOffset < -54) {
            moveTo(1);
          } else if (finalOffset > 54) {
            moveTo(-1);
          } else {
            setDragOffset(0);
            dragOffsetRef.current = 0;
            setIsDragging(false);
          }

          touchStartY.current = null;
        }}
      >
        {isLoadingFacts && <FeedSkeleton />}

        {visibleCards.map(({ fact, offset, step }) => {
          const translate = offset * 100 + (isDragging ? dragOffset / 7 : 0);
          const isActive = offset === 0;
          const depth = Math.abs(offset);
          const toneBackground = getToneBackground(fact.tone);
          const isSponsored = isCommercialCollaborationFact(fact);

          return (
            <article
              key={`${fact.id}-${step}`}
              aria-hidden={!isActive}
              data-active={isActive}
              className={`absolute inset-0 grid place-items-center ${toneBackground.className} px-5 transition-[transform,opacity,filter] duration-[1050ms] ease-[cubic-bezier(0.19,1,0.22,1)] will-change-transform sm:px-8 ${
                isActive
                  ? "pointer-events-auto opacity-100 blur-0"
                  : "pointer-events-none opacity-65 blur-[0.5px]"
              }`}
              style={{
                ...toneBackground.style,
                transform: `translateY(${translate}%) scale(${
                  isActive
                    ? 1 - Math.abs(dragOffset) / 3200
                    : 0.982 - depth * 0.018
                })`,
                transitionDuration: isDragging ? "0ms" : undefined,
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.64))]" />
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/70 to-transparent" />

              <div className="relative z-10 flex h-full w-full max-w-6xl flex-col pb-24 pt-36 sm:pb-20">
                <div className="flex flex-wrap items-center gap-3">
                  {isSponsored ? (
                    <span className="w-fit rounded-full border border-[#ffd166]/20 bg-[#ffd166]/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#ffe3a4] backdrop-blur-xl">
                      Collaboration commerciale
                    </span>
                  ) : (
                    <Link
                      href={`/decouvrir/theme/${fact.categorySlug}`}
                      onClick={() =>
                        void trackAnalyticsEvent({
                          entityType: "category",
                          eventName: "category_opened",
                          metadata: {
                            name: fact.category,
                            slug: fact.categorySlug,
                          },
                        })
                      }
                      className="w-fit rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white/85 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/15"
                    >
                      {fact.category}
                    </Link>
                  )}
                  {theme && (
                    <div className="w-fit rounded-full border border-white/10 bg-black/16 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/62 backdrop-blur-xl">
                      Thème
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 items-center py-7 sm:py-8">
                  <div className="w-full max-w-3xl">
                    <h1 className="max-w-[21ch] text-[clamp(1.75rem,4.6vw,3.45rem)] font-extrabold leading-[1.08] tracking-[-0.025em] [text-wrap:balance]">
                      {fact.title}
                    </h1>

                    <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/78 sm:text-lg">
                      {fact.detail}
                    </p>

                    {isSponsored ? (
                      <a
                href={fact.sourceUrl ?? "#"}
                        target={fact.sourceUrl ? "_blank" : undefined}
                        rel={fact.sourceUrl ? "noopener noreferrer" : undefined}
                        className="mt-7 inline-flex rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#07111f] shadow-[0_18px_55px_rgba(255,255,255,0.16)] transition hover:-translate-y-0.5 hover:bg-[#ffe7ad] lg:hidden"
                      >
                        En savoir plus
                      </a>
                    ) : (
                      <div
                        className="mt-7 flex items-center gap-3 lg:hidden"
                        data-mobile-actions
                      >
                        <button
                          type="button"
                          aria-label="Aimer"
                          onClick={() =>
                            toggleRemoteAction(
                              fact,
                              liked.includes(fact.id),
                              setLiked,
                              likeFact,
                              unlikeFact,
                              "fact_like",
                            )
                          }
                          className={`grid h-14 w-14 place-items-center rounded-full border border-white/15 backdrop-blur-xl transition hover:scale-105 ${
                            liked.includes(fact.id)
                              ? "bg-white text-[#07111f]"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          {actionIcons.like}
                        </button>

                        <button
                          type="button"
                          aria-label="Enregistrer"
                          onClick={() =>
                            toggleRemoteAction(
                              fact,
                              saved.includes(fact.id),
                              setSaved,
                              saveFact,
                              unsaveFact,
                              "fact_save",
                            )
                          }
                          className={`grid h-14 w-14 place-items-center rounded-full border border-white/15 backdrop-blur-xl transition hover:scale-105 ${
                            saved.includes(fact.id)
                              ? "bg-[#ffd166] text-[#07111f]"
                              : "bg-white/10 text-white"
                          }`}
                        >
                          {actionIcons.save}
                        </button>

                        <button
                          type="button"
                          aria-label="Partager"
                          onClick={shareFact}
                          className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-xl transition hover:scale-105"
                        >
                          {actionIcons.share}
                        </button>

                        <button
                          type="button"
                          aria-label="Voir le fait"
                          onClick={() => openFactDetail(fact)}
                          className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-xl transition hover:scale-105"
                        >
                          {actionIcons.view}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full max-w-2xl" data-fact-progress-source>
                  {isSponsored ? null : isLoadingAuth ? (
                    <div className="mb-5 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white/72 backdrop-blur-xl">
                      Chargement de ta progression
                    </div>
                  ) : isAuthenticated ? (
                    <>
                      <div className="mb-3 flex items-center justify-between text-xs text-white/72">
                        <span className="font-semibold">Progression</span>
                        <span className="font-bold text-white">
                          {dailyProgress.count}/{currentDailyGoal}
                        </span>
                      </div>
                      <div
                        className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/12"
                        data-fact-progress
                      >
                        <div
                          className="h-full rounded-full bg-[#ffd166] transition-[width] duration-500 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => rememberAuthRedirect(window.location.pathname)}
                      className="mb-5 inline-flex rounded-full border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-semibold text-white/68 backdrop-blur-xl transition hover:border-white/18 hover:text-white"
                    >
                      Connectez-vous pour sauvegarder votre progression
                    </Link>
                  )}

                  {cleanFactSource(fact.source) ? (
                    <div data-fact-source>
                      <FactSource
                        accent={fact.accent}
                        onSourceClick={() => {
                          if (isSponsored) {
                            return;
                          }

                          markFactReadInteraction(factReadTokenRef.current);
                          void trackAnalyticsEvent({
                            entityId: fact.id,
                            entityType: "fact",
                            eventName: "source_clicked",
                          });
                        }}
                        label={isSponsored ? "Partenaire:" : undefined}
                        source={fact.source}
                        sourceUrl={fact.sourceUrl}
                      />
                    </div>
                  ) : null}
                </div>

                {isSponsored ? (
                  <a
                href={fact.sourceUrl ?? "#"}
                    target={fact.sourceUrl ? "_blank" : undefined}
                    rel={fact.sourceUrl ? "noopener noreferrer" : undefined}
                    className="absolute right-5 top-1/2 hidden -translate-y-1/2 rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#07111f] shadow-[0_18px_55px_rgba(255,255,255,0.16)] transition hover:scale-[1.03] hover:bg-[#ffe7ad] sm:right-8 lg:inline-flex"
                  >
                    En savoir plus
                  </a>
                ) : (
                  <div
                    className="absolute right-5 top-1/2 hidden -translate-y-1/2 items-center gap-3 sm:right-8 lg:flex lg:flex-col"
                    data-desktop-actions
                  >
                    <button
                      type="button"
                      aria-label="Aimer"
                      onClick={() =>
                        toggleRemoteAction(
                          fact,
                          liked.includes(fact.id),
                          setLiked,
                          likeFact,
                          unlikeFact,
                          "fact_like",
                        )
                      }
                      className={`grid h-14 w-14 place-items-center rounded-full border border-white/15 backdrop-blur-xl transition hover:scale-105 ${
                        liked.includes(fact.id)
                          ? "bg-white text-[#07111f]"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {actionIcons.like}
                    </button>

                    <button
                      type="button"
                      aria-label="Enregistrer"
                      onClick={() =>
                        toggleRemoteAction(
                          fact,
                          saved.includes(fact.id),
                          setSaved,
                          saveFact,
                          unsaveFact,
                          "fact_save",
                        )
                      }
                      className={`grid h-14 w-14 place-items-center rounded-full border border-white/15 backdrop-blur-xl transition hover:scale-105 ${
                        saved.includes(fact.id)
                          ? "bg-[#ffd166] text-[#07111f]"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {actionIcons.save}
                    </button>

                    <button
                      type="button"
                      aria-label="Partager"
                      onClick={shareFact}
                      className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-xl transition hover:scale-105"
                    >
                      {actionIcons.share}
                    </button>

                    <button
                      type="button"
                      aria-label="Voir le fait"
                      onClick={() => openFactDetail(fact)}
                      className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-xl transition hover:scale-105"
                    >
                      {actionIcons.view}
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}

        {!hasFacts && !isLoadingFacts && (
          <div className="absolute inset-0 grid place-items-center bg-[#132338] px-6 text-center">
            <div className="max-w-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
                Découvrir est vide
              </p>
              <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.04em]">
                Aucun fait disponible pour le moment.
              </h1>
              <p className="mt-4 text-sm leading-6 text-white/62">
                {process.env.NODE_ENV === "production"
                  ? userMessages.emptyFactsPublic
                  : userMessages.emptyFactsDebug}
              </p>
            </div>
          </div>
        )}
      </section>

      {showGoalAnimation && (
        <button
          type="button"
          aria-label="Fermer l'animation d'objectif"
          onClick={() => setShowGoalAnimation(false)}
          className="fixed inset-0 z-50 grid cursor-default place-items-center overflow-hidden bg-black/20 backdrop-blur-[2px]"
        >
          {confettiPieces.map((piece, index) => (
            <span
              key={`${piece.left}-${piece.top}`}
              className="absolute h-3 w-1.5 rounded-full opacity-80"
              style={{
                animation: "confettiFloat 1.95s cubic-bezier(0.16,1,0.3,1) both",
                animationDelay: piece.delay,
                backgroundColor: piece.color,
                left: piece.left,
                top: piece.top,
                transform: `rotate(${index * 28}deg)`,
              }}
            />
          ))}

          {celebrationBursts.map((burst) => (
            <span
              key={`${burst.left}-${burst.top}`}
              className={`absolute rounded-full bg-[#ffd166] shadow-[0_0_30px_rgba(255,209,102,0.8)] ${burst.size}`}
              style={{
                animation: "sparkLift 1.65s ease-out both",
                animationDelay: burst.delay,
                left: burst.left,
                top: burst.top,
              }}
            />
          ))}

          <div className="relative w-[min(310px,calc(100vw-40px))] overflow-hidden rounded-[24px] border border-white/15 bg-[#07111f]/86 p-6 text-center shadow-[0_0_90px_rgba(255,209,102,0.22)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,209,102,0.22),transparent_42%)]" />
            <div className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffd166]/30 blur-2xl" />
            <div className="relative">
              <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#ffd166] text-[#07111f] shadow-[0_16px_50px_rgba(255,209,102,0.34)] goal-pop">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8">
                  <path
                    d="m5 12.4 4.1 4.1L19 6.8"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.6"
                  />
                </svg>
              </div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#ffd166]">
                Objectif atteint
              </p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-[-0.04em] text-white">
                {goalCelebrationMessage}
              </h2>
              <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-[#ffd166] to-[#6ae3c0] goal-fill" />
              </div>
            </div>
          </div>
        </button>
      )}

      {(showSwipeHint || isLoadingMoreFacts) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-5">
          <div className="grumm-scroll-float flex items-center gap-3 rounded-full border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/65 backdrop-blur-xl">
            <span className="h-7 w-[1px] overflow-hidden rounded-full bg-white/25">
              <span className="block h-3 w-full animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-white" />
            </span>
            {isLoadingMoreFacts
              ? "Chargement..."
              : "Swiper pour continuer"}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes confettiFloat {
          0% {
            opacity: 0;
            transform: translate3d(0, -22px, 0) rotate(0deg) scale(0.7);
          }
          18% {
            opacity: 0.85;
          }
          58% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
            transform: translate3d(24px, 132px, 0) rotate(280deg) scale(1);
          }
        }

        @keyframes sparkLift {
          0% {
            opacity: 0;
            transform: translate3d(0, 18px, 0) scale(0.4);
          }
          25% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -58px, 0) scale(1.5);
          }
        }

        .goal-fill {
          animation: goalFill 1.1s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .goal-pop {
          animation: goalPop 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes goalFill {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes goalPop {
          0% {
            opacity: 0;
            transform: scale(0.72);
          }
          70% {
            opacity: 1;
            transform: scale(1.08);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <FactShareModal fact={sharedFact} onClose={() => setSharedFact(null)} />
    </main>
  );
}
