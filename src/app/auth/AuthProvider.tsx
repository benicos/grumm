"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  displayName: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
};

type UserProfile = {
  username: string | null;
  daily_goal: number;
  avatar_url: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  const loadProfile = useCallback(
    async (nextSession: Session | null) => {
      const supabase = createSupabaseBrowserClient();

      if (!supabase || !nextSession?.user) {
        setProfile(null);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("username,daily_goal,avatar_url")
        .eq("id", nextSession.user.id)
        .maybeSingle();

      setProfile(data ?? null);
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setSession(null);
      setProfile(null);
      setIsLoading(false);
      return;
    }

    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    await loadProfile(data.session);
    setIsLoading(false);
  }, [loadProfile]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      displayName:
        profile?.username ??
        (typeof session?.user.user_metadata?.username === "string"
          ? session.user.user_metadata.username
          : null) ??
        session?.user.email?.split("@")[0] ??
        null,
      isLoading,
      isAuthenticated: Boolean(session?.user),
      refreshUser,
    }),
    [isLoading, profile, refreshUser, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
