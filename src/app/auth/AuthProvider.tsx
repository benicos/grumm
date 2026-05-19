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
import {
  getDefaultRolePermissions,
  type PermissionKey,
  type UserRole,
} from "@/lib/roles";

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
  role: UserRole;
  roleName?: string | null;
  permissions: PermissionKey[];
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_TIMEOUT_MS = 3500;

function withTimeout<T>(promise: PromiseLike<T>, fallback: unknown): Promise<T> {
  return new Promise((resolve) => {
    const timeout = window.setTimeout(
      () => resolve(fallback as T),
      AUTH_TIMEOUT_MS,
    );

    Promise.resolve(promise)
      .then((value) => resolve(value))
      .catch(() => resolve(fallback as T))
      .finally(() => window.clearTimeout(timeout));
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());

  const loadProfile = useCallback(
    async (nextSession: Session | null) => {
      const supabase = createSupabaseBrowserClient();

      if (!supabase || !nextSession?.user) {
        setProfile(null);
        return;
      }

      const { data } = await withTimeout(
        supabase
          .from("profiles")
          .select("username,daily_goal,avatar_url,role")
          .eq("id", nextSession.user.id)
          .maybeSingle(),
        { data: null, error: null },
      );

      if (!data) {
        setProfile(null);
        return;
      }

      let permissions = getDefaultRolePermissions(data.role) as PermissionKey[];
      let roleName: string | null = null;

      try {
        const { data: roleData } = await withTimeout(
          supabase
            .from("roles")
            .select("name,permissions")
            .eq("slug", data.role)
            .maybeSingle(),
          { data: null, error: null },
        );

        if (roleData) {
          roleName = roleData.name;
          permissions = Array.isArray(roleData.permissions)
            ? (roleData.permissions.filter(
                (permission): permission is PermissionKey =>
                  typeof permission === "string",
              ) as PermissionKey[])
            : permissions;
        }
      } catch {
        permissions = getDefaultRolePermissions(data.role) as PermissionKey[];
      }

      setProfile({
        ...data,
        permissions,
        roleName,
      });
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

    const { data } = await withTimeout(supabase.auth.getSession(), {
      data: { session: null },
      error: null,
    });
    setSession(data.session);
    await loadProfile(data.session);
    setIsLoading(false);
  }, [loadProfile]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      window.setTimeout(() => setIsLoading(false), 0);
      return;
    }

    withTimeout(supabase.auth.getSession(), {
      data: { session: null },
      error: null,
    }).then(async ({ data }) => {
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

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsLoading(false);
    }, AUTH_TIMEOUT_MS + 500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isLoading]);

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
