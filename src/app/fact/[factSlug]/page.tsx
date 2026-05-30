"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRef } from "react";
import {
  finishFactRead,
  markFactReadInteraction,
  startFactRead,
  trackAnalyticsEvent,
  type FactReadToken,
} from "@/lib/analytics/web";
import {
  DEFAULT_DAILY_GOAL,
  cleanFactSource,
  getFactBySlug,
  getUserFactActions,
  likeFact,
  recordFactView,
  saveFact,
  unlikeFact,
  unsaveFact,
} from "@/lib/facts";
import type { FeedFact } from "@/lib/facts";
import { rememberAuthRedirect } from "@/lib/authRedirect";
import { isCommercialCollaborationFact } from "@/lib/commercial";
import { getToneBackground } from "@/lib/gradients";
import { useAuth } from "../../auth/AuthProvider";
import { AppState } from "../../components/AppState";
import FactShareModal from "../../components/share/FactShareModal";
import FactSource from "../../components/FactSource";
import Navbar from "../../components/Navbar";
import { premiumPrimaryCtaClassName } from "../../components/buttonStyles";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

function FactDetailSkeleton() {
  return (
    <main className="min-h-screen bg-[#132338] text-white">
      <Navbar />
      <section className="mx-auto flex min-h-[calc(100vh-100px)] w-full max-w-5xl items-center px-6 py-14">
        <div className="w-full rounded-[28px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.42)]">
          <div className="h-8 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="mt-10 h-14 w-11/12 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-14 w-8/12 animate-pulse rounded-full bg-white/10" />
          <div className="mt-8 h-5 w-full animate-pulse rounded-full bg-white/10" />
          <div className="mt-3 h-5 w-9/12 animate-pulse rounded-full bg-white/10" />
        </div>
      </section>
    </main>
  );
}

export default function FactDetailPage() {
  const router = useRouter();
  const params = useParams<{ factSlug: string }>();
  const { isAuthenticated, isLoading, profile } = useAuth();
  const [fact, setFact] = useState<FeedFact | null>(null);
  const [isFactLoading, setIsFactLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sharedFact, setSharedFact] = useState<FeedFact | null>(null);
  const factReadTokenRef = useRef<FactReadToken | null>(null);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  };

  useEffect(() => {
    let isMounted = true;

    async function loadFact() {
      setIsFactLoading(true);
      setError(null);

      try {
        const nextFact = await getFactBySlug(params.factSlug);

        if (!isMounted) {
          return;
        }

        setFact(nextFact);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Ce fait ne peut pas être chargé.",
          );
        }
      } finally {
        if (isMounted) {
          setIsFactLoading(false);
        }
      }
    }

    loadFact();

    return () => {
      isMounted = false;
    };
  }, [params.factSlug]);

  useEffect(() => {
    if (
      !fact?.id ||
      isLoading ||
      !isAuthenticated ||
      isCommercialCollaborationFact(fact)
    ) {
      queueMicrotask(() => {
        setLiked(false);
        setSaved(false);
      });
      return;
    }

    getUserFactActions([fact.id])
      .then((actions) => {
        setLiked(actions.liked.includes(fact.id));
        setSaved(actions.saved.includes(fact.id));
      })
      .catch(() => undefined);
  }, [fact, isAuthenticated, isLoading]);

  useEffect(() => {
    if (
      isLoading ||
      !isAuthenticated ||
      !fact?.id ||
      isCommercialCollaborationFact(fact)
    ) {
      return;
    }

    recordFactView(fact.id, profile?.daily_goal ?? DEFAULT_DAILY_GOAL)
      .then((result) => {
        if (result.ok && result.completedToday) {
          void trackAnalyticsEvent({
            eventName: "daily_goal_completed",
            metadata: {
              daily_goal: result.dailyGoal,
              facts_read_count: result.viewedTodayCount,
            },
          });
        }
      })
      .catch(() => undefined);
  }, [fact, isAuthenticated, isLoading, profile?.daily_goal]);

  useEffect(() => {
    let cancelled = false;

    void finishFactRead(factReadTokenRef.current, { reason: "exit" });
    factReadTokenRef.current = null;

    if (isLoading || !fact?.id || isCommercialCollaborationFact(fact)) {
      return () => {
        cancelled = true;
      };
    }

    startFactRead(fact.id)
      .then((token) => {
        if (cancelled) {
          void finishFactRead(token, { reason: "exit" });
          return;
        }

        factReadTokenRef.current = token;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      void finishFactRead(factReadTokenRef.current, { reason: "exit" });
      factReadTokenRef.current = null;
    };
  }, [fact, isLoading]);

  const toggleProtectedAction = async (
    isActive: boolean,
    setter: (value: boolean) => void,
    enableAction: (factId: string) => Promise<{ ok: boolean }>,
    disableAction: (factId: string) => Promise<{ ok: boolean }>,
  ) => {
    if (!fact || isCommercialCollaborationFact(fact)) {
      return;
    }

    if (!isAuthenticated) {
      rememberAuthRedirect(window.location.pathname);
      showNotice("Connecte-toi pour synchroniser cette action.");
      window.setTimeout(() => router.push("/login"), 450);
      return;
    }

    setter(!isActive);
    markFactReadInteraction(factReadTokenRef.current);

    try {
      const result = isActive
        ? await disableAction(fact.id)
        : await enableAction(fact.id);

      if (!result.ok) {
        setter(isActive);
        router.push("/login");
        return;
      }

      if (!isActive) {
        void trackAnalyticsEvent({
          entityId: fact.id,
          entityType: "fact",
          eventName: enableAction === likeFact ? "fact_like" : "fact_save",
        });
      }
    } catch {
      setter(isActive);
      showNotice("Cette action n’a pas pu être synchronisée.");
    }
  };

  const shareFact = () => {
    if (!fact || isCommercialCollaborationFact(fact)) {
      return;
    }

    markFactReadInteraction(factReadTokenRef.current);
    void trackAnalyticsEvent({
      entityId: fact.id,
      entityType: "fact",
      eventName: "fact_shared",
    });
    setSharedFact(fact);
  };

  if (isFactLoading) {
    return <FactDetailSkeleton />;
  }

  if (error) {
    return (
      <AppState
        eyebrow="Fait indisponible"
        title="Impossible de charger ce fait."
        description={error}
        primaryHref="/discover"
        primaryLabel="Retour à Découvrir"
        secondaryHref="/explorer"
        secondaryLabel="Explorer"
      />
    );
  }

  if (!fact) {
    return (
      <AppState
        eyebrow="404"
        title="Ce fait n'existe pas."
        description="Le slug demandé ne correspond à aucun fait visible."
        primaryHref="/discover"
        primaryLabel="Retour à Découvrir"
        secondaryHref="/explorer"
        secondaryLabel="Explorer"
      />
    );
  }

  const toneBackground = getToneBackground(fact.tone);
  const isSponsored = isCommercialCollaborationFact(fact);

  return (
    <main
      className={`${inter.className} min-h-screen overflow-hidden ${toneBackground.className} text-white`}
      style={toneBackground.style}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(255,255,255,0.2),transparent_28%),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.72))]" />
      <Navbar />

      {notice && (
        <div
          role="status"
          className="fixed left-1/2 top-28 z-40 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/76 backdrop-blur-xl"
        >
          {notice}
        </div>
      )}

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-100px)] w-full max-w-6xl items-center gap-8 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="w-full rounded-[28px] border border-white/10 bg-black/18 p-6 shadow-[0_34px_130px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-3">
            {isSponsored ? (
              <span className="rounded-full border border-[#ffd166]/20 bg-[#ffd166]/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#ffe3a4] backdrop-blur-xl">
                Collaboration commerciale
              </span>
            ) : (
              <Link
                href={`/theme/${fact.categorySlug}`}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white/85 backdrop-blur-xl"
              >
                {fact.category}
              </Link>
            )}
          </div>

          <h1 className="mt-8 max-w-4xl text-[clamp(2.4rem,6vw,5.2rem)] font-extrabold leading-[0.96] tracking-[-0.055em] [text-wrap:balance]">
            {fact.title}
          </h1>

          <p className="mt-8 max-w-3xl text-base leading-8 text-white/72 sm:text-lg">
            {fact.detail}
          </p>

          {fact.longContent ? (
            <section className="mt-8 max-w-3xl rounded-[22px] border border-white/10 bg-black/18 p-5 text-white/78 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffd166]">
                En savoir plus
              </p>
              <div className="mt-4 whitespace-pre-wrap text-base leading-8 sm:text-lg">
                {fact.longContent}
              </div>
            </section>
          ) : null}

          {fact.hook ? (
            <div className="mt-8 max-w-3xl rounded-[18px] border border-white/10 bg-white/[0.055] p-5 text-sm font-semibold leading-6 text-white/68">
              À retenir : {fact.hook}
            </div>
          ) : null}

          <div className="mt-10 flex flex-wrap items-center gap-3">
            {isSponsored ? (
              <a
                href={fact.sourceUrl ?? "#"}
                target={fact.sourceUrl ? "_blank" : undefined}
                rel={fact.sourceUrl ? "noopener noreferrer" : undefined}
                className="rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#07111f] shadow-[0_18px_55px_rgba(255,255,255,0.16)] transition hover:scale-[1.02] hover:bg-[#ffe7ad]"
              >
                En savoir plus
              </a>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    toggleProtectedAction(liked, setLiked, likeFact, unlikeFact)
                  }
                  className={`rounded-full border border-white/15 px-5 py-3 text-sm font-bold backdrop-blur-xl transition hover:scale-[1.02] ${
                    liked ? "bg-white text-[#07111f]" : "bg-white/10 text-white"
                  }`}
                >
                  Aimer
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toggleProtectedAction(saved, setSaved, saveFact, unsaveFact)
                  }
                  className={`rounded-full border border-white/15 px-5 py-3 text-sm font-bold backdrop-blur-xl transition hover:scale-[1.02] ${
                    saved
                      ? "bg-[#ffd166] text-[#07111f]"
                      : "bg-white/10 text-white"
                  }`}
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={shareFact}
                  className="rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:scale-[1.02]"
                >
                  Partager
                </button>
              </>
            )}
            <Link
              href="/discover"
              className="rounded-full border border-white/15 bg-black/20 px-5 py-3 text-sm font-bold text-white/72 backdrop-blur-xl transition hover:scale-[1.02] hover:text-white"
            >
              Découvrir
            </Link>
          </div>

          {cleanFactSource(fact.source) ? (
            <div className="mt-10">
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
        </article>

        <aside className="rounded-[24px] border border-white/10 bg-black/22 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
            Continuer
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.04em]">
            Explore ce thème ou retourne au flux principal.
          </h2>
          <div className="mt-6 grid gap-3">
            {!isSponsored ? (
              <Link
                href={`/theme/${fact.categorySlug}`}
                className={premiumPrimaryCtaClassName}
              >
                Explorer ce thème
              </Link>
            ) : null}
            <Link
              href="/discover"
              className="rounded-[14px] border border-white/10 px-4 py-3 text-center text-sm font-bold text-white/72 transition hover:border-white/20 hover:text-white"
            >
              Lire d&apos;autres faits
            </Link>
          </div>
        </aside>
      </section>

      <FactShareModal fact={sharedFact} onClose={() => setSharedFact(null)} />
    </main>
  );
}
