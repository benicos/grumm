"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Inter } from "next/font/google";
import { useRouter } from "next/navigation";
import {
  DEFAULT_DAILY_GOAL,
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

function stringSeed(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed: number) {
  let value = seed;

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleFacts(facts: FeedFact[], key: string) {
  const random = seededRandom(stringSeed(key));
  const shuffled = [...facts];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function getSessionSeed(scope: string) {
  if (typeof window === "undefined") {
    return `${scope}:server`;
  }

  const key = `velora:feedSeed:${scope}`;
  const existingSeed = window.sessionStorage.getItem(key);

  if (existingSeed) {
    return existingSeed;
  }

  const seed = `${scope}:${Date.now()}:${Math.random()}`;
  window.sessionStorage.setItem(key, seed);
  return seed;
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
  } = useAuth();
  const [facts, setFacts] = useState<FeedFact[]>([]);
  const [theme, setTheme] = useState<CategorySummary | null>(null);
  const [isUnknownTheme, setIsUnknownTheme] = useState(false);
  const [isLoadingFacts, setIsLoadingFacts] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
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

  const hasFacts = facts.length > 0;
  const activeFactIndex = hasFacts
    ? ((currentStep % facts.length) + facts.length) % facts.length
    : 0;
  const activeFact = facts[activeFactIndex];
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
        const factIndex = ((step % facts.length) + facts.length) % facts.length;

        return {
          fact: facts[factIndex],
          offset,
          step,
        };
      })
    : [];

  const moveTo = useCallback((direction: 1 | -1) => {
    setCurrentStep((current) => Math.max(current + direction, 0));
    setDragOffset(0);
    dragOffsetRef.current = 0;
    setIsDragging(false);
  }, []);

  const showTemporaryNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  }, []);

  const toggleRemoteAction = async (
    factId: string,
    isActive: boolean,
    setter: Dispatch<SetStateAction<string[]>>,
    enableAction: (factId: string) => Promise<{ ok: boolean }>,
    disableAction: (factId: string) => Promise<{ ok: boolean }>,
  ) => {
    if (!isAuthenticated) {
      rememberAuthRedirect(window.location.pathname);
      showTemporaryNotice("Connecte-toi pour synchroniser cette action.");
      window.setTimeout(() => router.push("/login"), 450);
      return;
    }

    toggleAction(factId, setter);

    try {
      const result = isActive
        ? await disableAction(factId)
        : await enableAction(factId);

      if (!result.ok) {
        toggleAction(factId, setter);
        rememberAuthRedirect(window.location.pathname);
        router.push("/login");
      }
    } catch {
      toggleAction(factId, setter);
      showTemporaryNotice("Cette action n'a pas pu etre synchronisee.");
    }
  };

  const openFactDetail = (fact: FeedFact) => {
    router.push(`/fact/${fact.slug || fact.id}`);
  };

  const shareFact = async () => {
    if (!activeFact) {
      return;
    }

    const url =
      typeof window === "undefined"
        ? `/fact/${activeFact.slug}`
        : `${window.location.origin}/fact/${activeFact.slug}`;
    const text = `${activeFact.title} Source: ${activeFact.source}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: activeFact.title,
          text,
          url,
        });
      } catch {
        return;
      }
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${text} ${url}`);
      showTemporaryNotice("Lien copié.");
      return;
    }

    showTemporaryNotice("Copie indisponible sur ce navigateur.");
  };

  useEffect(() => {
    let isMounted = true;

    async function loadFacts() {
      setIsLoadingFacts(true);
      setFeedError(null);
      setIsUnknownTheme(false);
      reportedFactsRef.current = new Set<string>();
      goalAnimationShownRef.current = false;

      try {
        const result = await getFeedFacts({ themeSlug });

        if (!isMounted) {
          return;
        }

        if (themeSlug && !result.theme) {
          setFacts([]);
          setTheme(null);
          setIsUnknownTheme(true);
          return;
        }

        const seed = getSessionSeed(themeSlug ?? "all");
        setFacts(shuffleFacts(result.facts, seed));
        setTheme(result.theme ?? null);
        setCurrentStep(0);
      } catch (error) {
        if (isMounted) {
          setFacts([]);
          setFeedError(
            error instanceof Error
              ? error.message
              : "Découvrir est indisponible pour le moment.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingFacts(false);
        }
      }
    }

    loadFacts();

    return () => {
      isMounted = false;
    };
  }, [themeSlug]);

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
        const actions = await getUserFactActions(facts.map((fact) => fact.id));

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
          goalAnimationShownRef.current = true;
          setGoalCelebrationMessage(
            getGoalCelebrationMessage(result.completedDailyGoals),
          );
          setShowGoalAnimation(true);
          window.setTimeout(() => setShowGoalAnimation(false), 1700);
        }
      })
      .catch(() => undefined);
  }, [activeFact?.id, isAuthenticated, isLoadingAuth, profile?.daily_goal]);

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
        eyebrow="Theme introuvable"
        title="Ce theme n'existe pas encore."
        description="Le slug demande ne correspond a aucun theme publie dans Supabase."
        primaryHref="/explorer"
        primaryLabel="Explorer les themes"
        secondaryHref="/discover"
        secondaryLabel="Découvrir"
      />
    );
  }

  if (feedError && !isLoadingFacts) {
    return (
      <AppState
        eyebrow="Découvrir indisponible"
        title="Les faits ne peuvent pas etre charges."
        description={feedError}
        primaryHref="/discover"
        primaryLabel="Recharger Découvrir"
        secondaryHref="/explorer"
        secondaryLabel="Explorer"
      />
    );
  }

  return (
    <main
      className={`${inter.className} min-h-screen overflow-hidden bg-[#050b13] text-white`}
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
                  <div className="w-fit rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white/85 backdrop-blur-xl">
                    {fact.category}
                  </div>
                  {theme && (
                    <div className="w-fit rounded-full border border-white/10 bg-black/16 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/62 backdrop-blur-xl">
                      Theme
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

                    <div
                      className="mt-7 flex items-center gap-3 lg:hidden"
                      data-mobile-actions
                    >
                      <button
                        type="button"
                        aria-label="Aimer"
                        onClick={() =>
                          toggleRemoteAction(
                            fact.id,
                            liked.includes(fact.id),
                            setLiked,
                            likeFact,
                            unlikeFact,
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
                            fact.id,
                            saved.includes(fact.id),
                            setSaved,
                            saveFact,
                            unsaveFact,
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
                  </div>
                </div>

                <div className="w-full max-w-2xl" data-fact-progress-source>
                  {isLoadingAuth ? (
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
                    <div className="mb-5 rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white/72 backdrop-blur-xl">
                      Connecte-toi pour voir ta progression
                    </div>
                  )}

                  <div
                    className="flex flex-wrap items-center gap-3 text-sm text-white/70"
                    data-fact-source
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: fact.accent }}
                    />
                    <span>Source: {fact.source}</span>
                  </div>
                </div>

                <div
                  className="absolute right-5 top-1/2 hidden -translate-y-1/2 items-center gap-3 sm:right-8 lg:flex lg:flex-col"
                  data-desktop-actions
                >
                  <button
                    type="button"
                    aria-label="Aimer"
                    onClick={() =>
                      toggleRemoteAction(
                        fact.id,
                        liked.includes(fact.id),
                        setLiked,
                        likeFact,
                        unlikeFact,
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
                        fact.id,
                        saved.includes(fact.id),
                        setSaved,
                        saveFact,
                        unsaveFact,
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
              </div>
            </article>
          );
        })}

        {!hasFacts && !isLoadingFacts && (
          <div className="absolute inset-0 grid place-items-center bg-[#050b13] px-6 text-center">
            <div className="max-w-sm">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
                Découvrir est vide
              </p>
              <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.04em]">
                Aucun fait publie pour le moment.
              </h1>
              <p className="mt-4 text-sm leading-6 text-white/62">
                Ajoute des contenus publies dans Supabase pour alimenter cette
                page.
              </p>
            </div>
          </div>
        )}
      </section>

      {showGoalAnimation && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center overflow-hidden bg-black/20 backdrop-blur-[2px]">
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
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-5">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/65 backdrop-blur-xl">
          <span className="h-7 w-[1px] overflow-hidden rounded-full bg-white/25">
            <span className="block h-3 w-full animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-white" />
          </span>
          Swipe pour continuer
        </div>
      </div>

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
    </main>
  );
}
