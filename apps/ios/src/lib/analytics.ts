import AsyncStorage from "@react-native-async-storage/async-storage";

import { getSupabaseClient, withSupabaseTimeout } from "./supabase";

type AnalyticsEventName =
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
  | "login_completed";

type AnalyticsMetadata = Record<string, string | number | boolean | null | undefined>;

type SessionState = {
  anonymousId: string | null;
  factsViewed: number;
  id: string | null;
  lastActivityAt: number;
  pagesViewed: number;
  startedAt: number;
  userId: string | null;
};

export type MobileFactReadToken = {
  factId: string;
  id: string | null;
  interacted: boolean;
  startedAt: number;
};

const ANONYMOUS_ID_KEY = "grumm_anonymous_id";
const SESSION_KEY = "grumm_analytics_session";
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const MIN_COMPLETED_READ_MS = 8000;

let analyticsEnabled = true;
let currentUserId: string | null = null;
let currentSession: SessionState | null = null;

function randomId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const next = char === "x" ? value : (value & 0x3) | 0x8;
    return next.toString(16);
  });
}

function now() {
  return Date.now();
}

async function getAnonymousId() {
  const stored = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);

  if (stored) {
    return stored;
  }

  const generated = randomId();
  await AsyncStorage.setItem(ANONYMOUS_ID_KEY, generated);
  return generated;
}

async function readStoredSession() {
  const rawValue = await AsyncStorage.getItem(SESSION_KEY);
  const parsed = rawValue ? (JSON.parse(rawValue) as Partial<SessionState>) : null;

  if (!parsed || typeof parsed.startedAt !== "number" || typeof parsed.lastActivityAt !== "number") {
    return null;
  }

  if (now() - parsed.lastActivityAt > INACTIVITY_TIMEOUT_MS) {
    await AsyncStorage.removeItem(SESSION_KEY);
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
}

async function storeSession(session: SessionState | null) {
  if (!session) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }

  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function createSession() {
  const supabase = getSupabaseClient();
  const anonymousId = currentUserId ? null : await getAnonymousId();
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
  await storeSession(session);

  const { error } = await withSupabaseTimeout(
    supabase.from("analytics_sessions").insert({
      anonymous_id: anonymousId,
      id: session.id ?? undefined,
      platform: "ios",
      started_at: new Date(session.startedAt).toISOString(),
      user_id: currentUserId,
    }),
  ).catch(() => ({ error: true }));

  if (error) {
    currentSession = { ...session, id: null };
    await storeSession(currentSession);
    return currentSession;
  }

  return session;
}

async function ensureSession() {
  if (currentSession && now() - currentSession.lastActivityAt <= INACTIVITY_TIMEOUT_MS) {
    return currentSession;
  }

  const stored = await readStoredSession();

  if (stored) {
    currentSession = stored;
    return stored;
  }

  return createSession();
}

async function touchSession(session: SessionState) {
  session.lastActivityAt = now();
  await storeSession(session);
}

export async function setMobileAnalyticsUserId(userId: string | null) {
  if (currentUserId === userId) {
    return;
  }

  await endMobileAnalyticsSession();
  currentUserId = userId;
  currentSession = null;
  await storeSession(null);
}

export async function setMobileAnalyticsEnabled(enabled: boolean) {
  if (analyticsEnabled === enabled) {
    return;
  }

  analyticsEnabled = enabled;

  if (!enabled) {
    await endMobileAnalyticsSession();
  }
}

export async function trackMobileAnalyticsEvent({
  entityId,
  entityType,
  eventName,
  metadata,
}: {
  entityId?: string | null;
  entityType?: string | null;
  eventName: AnalyticsEventName;
  metadata?: AnalyticsMetadata;
}) {
  if (!analyticsEnabled) {
    return;
  }

  const supabase = getSupabaseClient();
  const session = await ensureSession();
  await touchSession(session);

  await withSupabaseTimeout(
    supabase.from("analytics_events").insert({
      anonymous_id: session.anonymousId,
      entity_id: entityId ?? null,
      entity_type: entityType ?? null,
      event_name: eventName,
      metadata: Object.fromEntries(
        Object.entries(metadata ?? {}).filter(([, value]) => value !== undefined),
      ),
      platform: "ios",
      session_id: session.id,
      user_id: session.userId,
    }),
  ).catch(() => undefined);
}

export async function trackMobilePageView(screen: string) {
  if (!analyticsEnabled) {
    return;
  }

  const session = await ensureSession();
  session.pagesViewed += 1;
  await touchSession(session);
  await updateMobileSession();
  await trackMobileAnalyticsEvent({
    eventName: "page_viewed",
    metadata: { screen },
  });
}

async function updateMobileSession(endSession = false) {
  const session = currentSession;

  if (!session?.id) {
    return;
  }

  const endedAt = endSession ? now() : null;
  const durationSeconds = Math.max(0, Math.round(((endedAt ?? now()) - session.startedAt) / 1000));

  await withSupabaseTimeout(
    getSupabaseClient()
      .from("analytics_sessions")
      .update({
        duration_seconds: durationSeconds,
        ended_at: endedAt ? new Date(endedAt).toISOString() : null,
        facts_viewed: session.factsViewed,
        pages_viewed: session.pagesViewed,
      })
      .eq("id", session.id),
  ).catch(() => undefined);
}

export async function endMobileAnalyticsSession() {
  await updateMobileSession(true);
  currentSession = null;
  await storeSession(null).catch(() => undefined);
}

export async function startMobileFactRead(factId: string): Promise<MobileFactReadToken> {
  if (!analyticsEnabled) {
    return {
      factId,
      id: null,
      interacted: false,
      startedAt: now(),
    };
  }

  const session = await ensureSession();
  session.factsViewed += 1;
  await touchSession(session);
  await updateMobileSession();
  await trackMobileAnalyticsEvent({
    entityId: factId,
    entityType: "fact",
    eventName: "fact_viewed",
  });

  const token: MobileFactReadToken = {
    factId,
    id: randomId(),
    interacted: false,
    startedAt: now(),
  };

  const { error } = await withSupabaseTimeout(
    getSupabaseClient().from("fact_read_events").insert({
      anonymous_id: session.anonymousId,
      fact_id: factId,
      id: token.id ?? undefined,
      platform: "ios",
      session_id: session.id,
      started_at: new Date(token.startedAt).toISOString(),
      user_id: session.userId,
    }),
  ).catch(() => ({ error: true }));

  return error ? { ...token, id: null } : token;
}

export function markMobileFactReadInteraction(token: MobileFactReadToken | null) {
  if (token) {
    token.interacted = true;
  }
}

export async function finishMobileFactRead(token: MobileFactReadToken | null) {
  if (!token || !analyticsEnabled) {
    return;
  }

  const endedAt = now();
  const durationSeconds = Math.max(0, Math.round((endedAt - token.startedAt) / 1000));
  const completed = token.interacted || endedAt - token.startedAt >= MIN_COMPLETED_READ_MS;

  if (token.id) {
    await withSupabaseTimeout(
      getSupabaseClient()
        .from("fact_read_events")
        .update({
          completed,
          duration_seconds: durationSeconds,
          ended_at: new Date(endedAt).toISOString(),
        })
        .eq("id", token.id),
    ).catch(() => undefined);
  }

  if (completed) {
    await trackMobileAnalyticsEvent({
      entityId: token.factId,
      entityType: "fact",
      eventName: "fact_read_completed",
      metadata: { duration_seconds: durationSeconds },
    });
  }
}
