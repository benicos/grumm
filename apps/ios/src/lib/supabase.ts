import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { userMessages } from "../config/app";
import type { Database } from "../../../../src/types/database";
import { logStructuredError } from "./logger";

let mobileSupabaseClient: SupabaseClient<Database> | null = null;
const SUPABASE_TIMEOUT_MS = 9000;

export async function clearSupabaseAuthStorage() {
  const keys = await AsyncStorage.getAllKeys();
  const authKeys = keys.filter((key) => key.startsWith("sb-") && key.includes("auth-token"));

  if (authKeys.length > 0) {
    await AsyncStorage.multiRemove(authKeys);
  }
}

export function isInvalidRefreshTokenError(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error ?? "").toLowerCase();

  return message.includes("invalid refresh token") || message.includes("refresh token not found");
}

export function getSupabaseClient() {
  if (mobileSupabaseClient) {
    return mobileSupabaseClient;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(userMessages.missingSupabaseConfig);
  }

  mobileSupabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: AsyncStorage,
    },
  });

  return mobileSupabaseClient;
}

export async function withSupabaseTimeout<T>(
  promise: PromiseLike<T>,
  message: string = userMessages.genericLoadError,
  timeoutMs = SUPABASE_TIMEOUT_MS,
  perfLabel?: string,
): Promise<T> {
  if (__DEV__ && perfLabel) {
    console.time(`[Supabase] ${perfLabel}`);
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      const error = new Error(message);
      logStructuredError(error, {
        operation: "supabase request timeout",
        source: "Network",
      });
      reject(error);
    }, timeoutMs);

    Promise.resolve(promise)
      .then(resolve)
      .catch((error) => {
        if (!isInvalidRefreshTokenError(error)) {
          logStructuredError(error, {
            operation: "supabase request",
            source: "Supabase",
          });
        }
        reject(error);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (__DEV__ && perfLabel) {
          console.timeEnd(`[Supabase] ${perfLabel}`);
        }
      });
  });
}
