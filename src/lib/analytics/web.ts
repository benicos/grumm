"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

export type AnalyticsEventName =
  | "app_opened"
  | "page_viewed"
  | "category_opened"
  | "search_used"
  | "fact_viewed"
  | "fact_read_completed"
  | "fact_shared"
  | "source_clicked"
  | "fact_liked"
  | "fact_saved"
  | "profile_opened"
  | "signup_completed"
  | "login_completed"
  | "admin_fact_created"
  | "admin_fact_updated";

type AnalyticsPlatform = "web";

type AnalyticsMetadata = Record<string, Json | undefined>;

export type AnalyticsEventInput = {
  entityId?: string | null;
  entityType?: string | null;
  eventName: AnalyticsEventName;
  metadata?: AnalyticsMetadata;
};

type SessionState = {
  anonymousId: string | null;
  factsViewed: number;
  id: string | null;
  lastActivityAt: number;
  pagesViewed: number;
  startedAt: number;
  userId: string | null;
};

export type FactReadToken = {
  factId: string;
  id: string | null;
  interacted: boolean;
  startedAt: number;
};

const ANONYMOUS_ID_KEY = "grumm_anonymous_id";
const SESSION_KEY = "grumm_analytics_session";
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_UPDATE_DEBOUNCE_MS = 2200;
const EVENT_FLUSH_DEBOUNCE_MS = 3200;
const EVENT_BATCH_SIZE = 8;
const MIN_COMPLETED_READ_MS = 8000;
const platform: AnalyticsPlatform = "web";

let anonymousIdCache: string | null = null;
let currentUserId: string | null = null;
let currentSession: SessionState | null = null;
let sessionPromise: Promise<SessionState> | null = null;
let sessionUpdateTimer: number | null = null;
let eventFlushTimer: number | null = null;
let analyticsEnabled = true;
const eventQueue: AnalyticsEventInput[] = [];

function now() {
  return Date.now();
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const next = char === "x" ? value : (value & 0x3) | 0x8;
    return next.toString(16);
  });
}

function getAnonymousId() {
  if (typeof window === "undefined") {
    return null;
  }

  if (anonymousIdCache) {
    return anonymousIdCache;
  }

  try {
    const stored = window.localStorage.getItem(ANONYMOUS_ID_KEY);

    if (stored) {
      anonymousIdCache = stored;
      return stored;
    }

    const generated = randomId();
    window.localStorage.setItem(ANONYMOUS_ID_KEY, generated);
    anonymousIdCache = generated;
    return generated;
  } catch {
    anonymousIdCache = randomId();
    return anonymousIdCache;
  }
}

function sanitizeMetadata(metadata?: AnalyticsMetadata): Json {
  if (!metadata) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  ) as Json;
}

function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(SESSION_KEY);
    const parsed = rawValue ? (JSON.parse(rawValue) as Partial<SessionState>) : null;

    if (
      !parsed ||
      typeof parsed.startedAt !== "number" ||
      typeof parsed.lastActivityAt !== "number"
    ) {
      return null;
    }

    if (now() - parsed.lastActivityAt > INACTIVITY_TIMEOUT_MS) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    if ((parsed.userId ?? null) !== currentUserId) {
      return null;
    }

    return {
      anonymousId: parsed.anonymousId ?? null,
      factsViewed: parsed.factsViewed ?? 0,
      id: parsed.id ?? null,
      lastActivityAt: parsed.lastActivityAt,
      pagesViewed: parsed.pagesViewed ?? 0,
      startedAt: parsed.startedAt,
      userId: parsed.userId ?? null,
    } satisfies SessionState;
  } catch {
    return null;
  }
}

function storeSession(session: SessionState | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (!session) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return;
    }

    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Analytics storage is best effort and must never block the UI.
  }
}

async function createSession() {
  const supabase = createSupabaseBrowserClient();
  const anonymousId = currentUserId ? null : getAnonymousId();
  const session: SessionState = {
    anonymousId,
    factsViewed: 0,
    id: randomId(),
    lastActivityAt: now(),
    pagesViewed: 0,
    startedAt: now(),
    userId: currentUserId,
  };

  currentSession = session;
  storeSession(session);

  if (!supabase) {
    return { ...session, id: null };
  }

  const { error } = await supabase.from("analytics_sessions").insert({
    anonymous_id: anonymousId,
    id: session.id ?? undefined,
    platform,
    started_at: new Date(session.startedAt).toISOString(),
    user_id: currentUserId,
  });

  if (error) {
    currentSession = { ...session, id: null };
    storeSession(currentSession);
    return currentSession;
  }

  return session;
}

async function ensureSession() {
  if (currentSession && now() - currentSession.lastActivityAt <= INACTIVITY_TIMEOUT_MS) {
    return currentSession;
  }

  const storedSession = readStoredSession();

  if (storedSession) {
    currentSession = storedSession;
    return storedSession;
  }

  if (!sessionPromise) {
    sessionPromise = createSession().finally(() => {
      sessionPromise = null;
    });
  }

  return sessionPromise;
}

function touchSession(session: SessionState) {
  session.lastActivityAt = now();
  storeSession(session);
}

async function updateSessionNow(endSession = false) {
  const supabase = createSupabaseBrowserClient();
  const session = currentSession;

  if (!supabase || !session?.id) {
    return;
  }

  const endedAt = endSession ? now() : null;
  const durationSeconds = Math.max(
    0,
    Math.round(((endedAt ?? now()) - session.startedAt) / 1000),
  );

  await supabase
    .from("analytics_sessions")
    .update({
      duration_seconds: durationSeconds,
      ended_at: endedAt ? new Date(endedAt).toISOString() : null,
      facts_viewed: session.factsViewed,
      pages_viewed: session.pagesViewed,
    })
    .eq("id", session.id);
}

function scheduleSessionUpdate() {
  if (typeof window === "undefined") {
    return;
  }

  if (sessionUpdateTimer !== null) {
    window.clearTimeout(sessionUpdateTimer);
  }

  sessionUpdateTimer = window.setTimeout(() => {
    sessionUpdateTimer = null;
    void updateSessionNow();
  }, SESSION_UPDATE_DEBOUNCE_MS);
}

async function incrementSessionCounters(input: {
  factsViewed?: number;
  pagesViewed?: number;
}) {
  const session = await ensureSession();
  session.factsViewed += input.factsViewed ?? 0;
  session.pagesViewed += input.pagesViewed ?? 0;
  touchSession(session);
  scheduleSessionUpdate();
  return session;
}

async function flushEvents() {
  if (eventFlushTimer !== null && typeof window !== "undefined") {
    window.clearTimeout(eventFlushTimer);
    eventFlushTimer = null;
  }

  if (eventQueue.length === 0) {
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const batch = eventQueue.splice(0, EVENT_BATCH_SIZE);

  if (!supabase) {
    return;
  }

  const session = await ensureSession();
  touchSession(session);

  await supabase.from("analytics_events").insert(
    batch.map((event) => ({
      anonymous_id: session.anonymousId,
      entity_id: event.entityId ?? null,
      entity_type: event.entityType ?? null,
      event_name: event.eventName,
      metadata: sanitizeMetadata(event.metadata),
      platform,
      session_id: session.id,
      user_id: session.userId,
    })),
  );

  if (eventQueue.length > 0) {
    scheduleEventFlush();
  }
}

function scheduleEventFlush() {
  if (typeof window === "undefined") {
    return;
  }

  if (eventQueue.length >= EVENT_BATCH_SIZE) {
    void flushEvents();
    return;
  }

  if (eventFlushTimer !== null) {
    return;
  }

  eventFlushTimer = window.setTimeout(() => {
    void flushEvents();
  }, EVENT_FLUSH_DEBOUNCE_MS);
}

export function setAnalyticsUserId(userId: string | null) {
  if (currentUserId === userId) {
    return;
  }

  if (currentSession) {
    void endAnalyticsSession();
  }

  currentUserId = userId;
  currentSession = null;
  storeSession(null);
}

export function setAnalyticsEnabled(enabled: boolean) {
  if (analyticsEnabled === enabled) {
    return;
  }

  analyticsEnabled = enabled;

  if (!enabled) {
    eventQueue.length = 0;
    void endAnalyticsSession();
  }
}

export async function trackAnalyticsEvent(event: AnalyticsEventInput) {
  if (!analyticsEnabled) {
    return;
  }

  await ensureSession();
  eventQueue.push(event);
  scheduleEventFlush();
}

export async function trackPageView(pathname: string) {
  if (!analyticsEnabled || pathname.startsWith("/admin")) {
    return;
  }

  await incrementSessionCounters({ pagesViewed: 1 });
  await trackAnalyticsEvent({
    eventName: "page_viewed",
    metadata: { path: pathname },
  });
}

export async function endAnalyticsSession() {
  await flushEvents();
  await updateSessionNow(true);
  currentSession = null;
  storeSession(null);
}

export function installAnalyticsLifecycle() {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleVisibility = () => {
    if (document.visibilityState === "hidden") {
      void endAnalyticsSession();
    } else {
      if (analyticsEnabled) {
        void ensureSession();
      }
    }
  };
  const handlePageHide = () => {
    void endAnalyticsSession();
  };

  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("pagehide", handlePageHide);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("pagehide", handlePageHide);
  };
}

export async function startFactRead(factId: string): Promise<FactReadToken> {
  if (!analyticsEnabled) {
    return {
      factId,
      id: null,
      interacted: false,
      startedAt: now(),
    };
  }

  const session = await incrementSessionCounters({ factsViewed: 1 });
  const supabase = createSupabaseBrowserClient();
  const token: FactReadToken = {
    factId,
    id: randomId(),
    interacted: false,
    startedAt: now(),
  };

  await trackAnalyticsEvent({
    entityId: factId,
    entityType: "fact",
    eventName: "fact_viewed",
  });

  if (!supabase) {
    return { ...token, id: null };
  }

  const { error } = await supabase.from("fact_read_events").insert({
    anonymous_id: session.anonymousId,
    fact_id: factId,
    id: token.id ?? undefined,
    platform,
    session_id: session.id,
    started_at: new Date(token.startedAt).toISOString(),
    user_id: session.userId,
  });

  if (error) {
    return { ...token, id: null };
  }

  return token;
}

export function markFactReadInteraction(token: FactReadToken | null) {
  if (token) {
    token.interacted = true;
  }
}

export async function finishFactRead(
  token: FactReadToken | null,
  options?: { completed?: boolean },
) {
  if (!token || !analyticsEnabled) {
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const endedAt = now();
  const durationSeconds = Math.max(
    0,
    Math.round((endedAt - token.startedAt) / 1000),
  );
  const completed =
    Boolean(options?.completed) ||
    token.interacted ||
    endedAt - token.startedAt >= MIN_COMPLETED_READ_MS;

  if (token.id && supabase) {
    await supabase
      .from("fact_read_events")
      .update({
        completed,
        duration_seconds: durationSeconds,
        ended_at: new Date(endedAt).toISOString(),
      })
      .eq("id", token.id);
  }

  if (completed) {
    await trackAnalyticsEvent({
      entityId: token.factId,
      entityType: "fact",
      eventName: "fact_read_completed",
      metadata: { duration_seconds: durationSeconds },
    });
  }
}
