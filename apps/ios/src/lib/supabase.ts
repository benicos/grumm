import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { userMessages } from "../config/app";
import type { Database } from "../../../../src/types/database";
import { logStructuredError } from "./logger";

let mobileSupabaseClient: SupabaseClient<Database> | null = null;
const SUPABASE_TIMEOUT_MS = 18000;
let hasLoggedSupabaseConfig = false;
const supabaseOperationCounts = new Map<string, number>();

type SupabaseTimeoutOptions = {
  logError?: boolean;
  logTimeout?: boolean;
};

type StoredSessionDiagnostics = {
  authKeyCount: number;
  expiresInSeconds: number | null;
  hasExpiresAt: boolean;
  hasLocalSession: boolean;
  isExpired: boolean | null;
  refreshLikelyNeeded: boolean;
};

export class SupabaseRequestTimeoutError extends Error {
  readonly durationMs: number;
  readonly isLocalTimeout = true;
  readonly operation: string;
  readonly timeoutMs: number;

  constructor(message: string, operation: string, timeoutMs: number, durationMs: number) {
    super(message);
    this.name = "SupabaseRequestTimeoutError";
    this.durationMs = durationMs;
    this.operation = operation;
    this.timeoutMs = timeoutMs;
  }
}

function normalizeEnvValue(value: string | undefined) {
  return value?.trim().replace(/^["'`]|["'`]$/g, "") ?? "";
}

function normalizeSupabaseUrl(value: string | undefined) {
  const normalizedValue = normalizeEnvValue(value).replace(/\/+$/, "");

  if (!normalizedValue || /\s/.test(normalizedValue)) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalizedValue);

    if (parsedUrl.protocol !== "https:") {
      return null;
    }

    return parsedUrl.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function isUnsafeSupabaseClientKey(value: string) {
  const normalizedValue = value.toLowerCase();

  return normalizedValue.startsWith("sb_secret_") || normalizedValue.includes("service_role");
}

function logSupabaseConfigStatus(supabaseUrl: string | null, supabaseAnonKey: string) {
  if (!__DEV__ || hasLoggedSupabaseConfig) {
    return;
  }

  hasLoggedSupabaseConfig = true;
  console.info("[Supabase mobile config]", {
    hasAnonKey: Boolean(supabaseAnonKey),
    anonKeyLength: supabaseAnonKey.length,
    hasUrl: Boolean(supabaseUrl),
    urlHostname: supabaseUrl ? new URL(supabaseUrl).hostname : null,
  });
}

function getMobileSupabaseConfig() {
  const supabaseUrl = normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
  const supabaseAnonKey = normalizeEnvValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  logSupabaseConfigStatus(supabaseUrl, supabaseAnonKey);

  if (!supabaseUrl || !supabaseAnonKey || isUnsafeSupabaseClientKey(supabaseAnonKey)) {
    throw new Error(userMessages.missingSupabaseConfig);
  }

  return { supabaseAnonKey, supabaseUrl };
}

function isSupabaseAuthStorageKey(key: string) {
  return key.startsWith("sb-") && key.includes("auth-token");
}

export async function clearSupabaseAuthStorage() {
  const keys = await AsyncStorage.getAllKeys();
  const authKeys = keys.filter(isSupabaseAuthStorageKey);

  if (authKeys.length > 0) {
    await AsyncStorage.multiRemove(authKeys);
  }
}

export async function clearMalformedSupabaseAuthStorage() {
  const operation = "auth.storage.validateSession";
  const startedAt = Date.now();
  const callCount = nextSupabaseOperationCall(operation);

  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(isSupabaseAuthStorageKey);
    const keysToRemove: string[] = [];

    await Promise.all(
      authKeys.map(async (key) => {
        const value = await AsyncStorage.getItem(key);

        if (!value) {
          keysToRemove.push(key);
          return;
        }

        try {
          const parsed = JSON.parse(value) as {
            currentSession?: { refresh_token?: unknown };
            refresh_token?: unknown;
          };
          const refreshToken = parsed.currentSession?.refresh_token ?? parsed.refresh_token;

          if (typeof refreshToken !== "string" || !refreshToken) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }),
    );

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }

    if (__DEV__) {
      console.info("[Supabase perf]", {
        authKeyCount: authKeys.length,
        callCount,
        durationMs: Date.now() - startedAt,
        operation,
        removedCount: keysToRemove.length,
        status: "success",
      });
    }
  } catch (error) {
    logSupabasePerformance({ callCount, error, operation, startedAt, status: "failure" });
    throw error;
  }
}

export function isInvalidRefreshTokenError(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();

  return message.includes("invalid refresh token") || message.includes("refresh token not found");
}

export function isSupabaseRequestTimeout(error: unknown) {
  return error instanceof SupabaseRequestTimeoutError;
}

function getErrorField(error: unknown, key: string) {
  return error !== null && typeof error === "object" && key in error
    ? (error as Record<string, unknown>)[key]
    : undefined;
}

function getSupabaseErrorStatus(error: unknown) {
  return getErrorField(error, "status") ?? getErrorField(error, "statusCode") ?? null;
}

function getSupabaseErrorType(error: unknown) {
  if (isSupabaseRequestTimeout(error)) {
    return "local_timeout";
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();
  const code = String(getErrorField(error, "code") ?? "");

  if (message.includes("network") || message.includes("fetch")) {
    return "network_unreachable";
  }

  if (code === "42501" || message.includes("permission") || message.includes("rls")) {
    return "rls_or_permission";
  }

  return "supabase_error";
}

function nextSupabaseOperationCall(operation: string) {
  const count = (supabaseOperationCounts.get(operation) ?? 0) + 1;
  supabaseOperationCounts.set(operation, count);
  return count;
}

function getSafeErrorMessage(error: unknown) {
  if (!error) {
    return null;
  }

  const message =
    error instanceof Error
      ? error.message
      : String(getErrorField(error, "message") ?? error);

  return message.slice(0, 240);
}

function getSupabaseResultError(value: unknown) {
  const error = getErrorField(value, "error");
  return error || null;
}

function logSupabasePerformance({
  callCount,
  error,
  operation,
  startedAt,
  status,
  timeoutMs,
}: {
  callCount: number;
  error?: unknown;
  operation: string;
  startedAt: number;
  status: "failure" | "success" | "timeout";
  timeoutMs?: number;
}) {
  if (!__DEV__) {
    return;
  }

  console.info("[Supabase perf]", {
    callCount,
    durationMs: Date.now() - startedAt,
    errorCode: error ? getErrorField(error, "code") ?? null : null,
    errorMessage: getSafeErrorMessage(error),
    errorType: error ? getSupabaseErrorType(error) : null,
    operation,
    status,
    statusCode: error ? getSupabaseErrorStatus(error) : null,
    timeoutMs: timeoutMs ?? null,
  });
}

export function getSupabaseClient() {
  if (mobileSupabaseClient) {
    return mobileSupabaseClient;
  }

  const operation = "supabase.client.init";
  const startedAt = Date.now();
  const callCount = nextSupabaseOperationCall(operation);

  try {
    const { supabaseAnonKey, supabaseUrl } = getMobileSupabaseConfig();

    mobileSupabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        persistSession: true,
        storage: AsyncStorage,
      },
    });
    logSupabasePerformance({ callCount, operation, startedAt, status: "success" });
  } catch (error) {
    logSupabasePerformance({ callCount, error, operation, startedAt, status: "failure" });
    throw error;
  }

  return mobileSupabaseClient;
}

export async function measureSupabaseStoredSession() {
  const operation = "auth.storage.readSession";
  const startedAt = Date.now();
  const callCount = nextSupabaseOperationCall(operation);

  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(isSupabaseAuthStorageKey);
    const diagnostics: StoredSessionDiagnostics = {
      authKeyCount: authKeys.length,
      expiresInSeconds: null,
      hasExpiresAt: false,
      hasLocalSession: false,
      isExpired: null,
      refreshLikelyNeeded: false,
    };

    for (const key of authKeys) {
      const value = await AsyncStorage.getItem(key);

      if (!value) {
        continue;
      }

      try {
        const parsed = JSON.parse(value) as {
          access_token?: unknown;
          currentSession?: {
            access_token?: unknown;
            expires_at?: unknown;
            refresh_token?: unknown;
          };
          expires_at?: unknown;
          refresh_token?: unknown;
        };
        const storedSession = parsed.currentSession ?? parsed;
        const hasAccessToken = typeof storedSession.access_token === "string";
        const hasRefreshToken = typeof storedSession.refresh_token === "string";
        const expiresAt =
          typeof storedSession.expires_at === "number" ? storedSession.expires_at : null;

        if (!hasAccessToken && !hasRefreshToken) {
          continue;
        }

        diagnostics.hasLocalSession = true;
        diagnostics.hasExpiresAt = expiresAt !== null;

        if (expiresAt !== null) {
          diagnostics.expiresInSeconds = Math.round(expiresAt - Date.now() / 1000);
          diagnostics.isExpired = diagnostics.expiresInSeconds <= 0;
          diagnostics.refreshLikelyNeeded = diagnostics.expiresInSeconds <= 60;
        } else {
          diagnostics.isExpired = null;
          diagnostics.refreshLikelyNeeded = true;
        }

        break;
      } catch {
        diagnostics.refreshLikelyNeeded = true;
      }
    }

    if (__DEV__) {
      console.info("[Supabase perf]", {
        ...diagnostics,
        callCount,
        durationMs: Date.now() - startedAt,
        operation,
        status: "success",
      });
    }

    return diagnostics;
  } catch (error) {
    logSupabasePerformance({ callCount, error, operation, startedAt, status: "failure" });
    throw error;
  }
}

export async function withSupabaseTimeout<T>(
  promise: PromiseLike<T>,
  message: string = userMessages.genericLoadError,
  timeoutMs = SUPABASE_TIMEOUT_MS,
  perfLabel?: string,
  options: SupabaseTimeoutOptions = {},
): Promise<T> {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const timerLabel = __DEV__ && perfLabel ? `[Supabase] ${perfLabel}:${requestId}` : null;
  const startedAt = Date.now();
  const operation = perfLabel ?? "unlabeled";
  const callCount = nextSupabaseOperationCall(operation);
  const shouldLogTimeout = options.logTimeout ?? false;
  const shouldLogError = options.logError ?? true;

  if (timerLabel) {
    console.time(timerLabel);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let timerEnded = false;
    const finishTimer = () => {
      if (timerEnded) {
        return;
      }

      timerEnded = true;
      if (timerLabel) {
        console.timeEnd(timerLabel);
      }
    };
    const timeout =
      timeoutMs > 0
        ? setTimeout(() => {
            if (settled) {
              return;
            }

            settled = true;
            const durationMs = Date.now() - startedAt;
            const error = new SupabaseRequestTimeoutError(message, operation, timeoutMs, durationMs);
            logSupabasePerformance({ callCount, error, operation, startedAt, status: "timeout", timeoutMs });
            if (shouldLogTimeout) {
              logStructuredError(error, {
                operation: `${operation} timeout`,
                payload: {
                  durationMs,
                  errorType: getSupabaseErrorType(error),
                  status: getSupabaseErrorStatus(error),
                  timeoutMs,
                },
                source: "Network",
              });
            }
            finishTimer();
            reject(error);
          }, timeoutMs)
        : null;

    Promise.resolve(promise)
      .then((value) => {
        if (settled) {
          return;
        }

        settled = true;
        if (timeout) {
          clearTimeout(timeout);
        }
        const resultError = getSupabaseResultError(value);
        logSupabasePerformance({
          callCount,
          error: resultError,
          operation,
          startedAt,
          status: resultError ? "failure" : "success",
        });
        finishTimer();
        resolve(value);
      })
      .catch((error) => {
        if (settled) {
          return;
        }

        settled = true;
        if (timeout) {
          clearTimeout(timeout);
        }
        logSupabasePerformance({ callCount, error, operation, startedAt, status: "failure" });
        if (!isInvalidRefreshTokenError(error)) {
          if (shouldLogError) {
            logStructuredError(error, {
              operation: `${operation} failed`,
              payload: {
                durationMs: Date.now() - startedAt,
                errorType: getSupabaseErrorType(error),
                status: getSupabaseErrorStatus(error),
              },
              source: "Supabase",
            });
          }
        }
        finishTimer();
        reject(error);
      })
      .finally(() => {
        finishTimer();
      });
  });
}
