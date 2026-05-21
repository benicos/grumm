import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { userMessages } from "../config/app";
import type { Database } from "../../../../src/types/database";

let mobileSupabaseClient: SupabaseClient<Database> | null = null;
const SUPABASE_TIMEOUT_MS = 9000;

export async function clearSupabaseAuthStorage() {
  const keys = await AsyncStorage.getAllKeys();
  const authKeys = keys.filter((key) => key.startsWith("sb-") && key.includes("auth-token"));

  if (authKeys.length > 0) {
    await AsyncStorage.multiRemove(authKeys);
  }
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
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    Promise.resolve(promise)
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
}
