import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type BrowserSupabaseClient = SupabaseClient<Database>;

let browserClient: BrowserSupabaseClient | null = null;

const globalSupabase = globalThis as typeof globalThis & {
  __veloraSupabaseBrowserClient?: BrowserSupabaseClient;
};

function isBrowserSafeSupabaseKey(key?: string) {
  return Boolean(key && !key.startsWith("sb_secret_"));
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      isBrowserSafeSupabaseKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function createSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    return null;
  }

  if (browserClient) {
    return browserClient;
  }

  if (globalSupabase.__veloraSupabaseBrowserClient) {
    browserClient = globalSupabase.__veloraSupabaseBrowserClient;
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !isBrowserSafeSupabaseKey(supabaseAnonKey)) {
    return null;
  }

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
  globalSupabase.__veloraSupabaseBrowserClient = browserClient;

  return browserClient;
}
