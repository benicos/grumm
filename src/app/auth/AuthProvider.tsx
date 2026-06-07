"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  clearSupabaseAuthStorage,
  clearMalformedSupabaseAuthStorage,
  createSupabaseBrowserClient,
  isInvalidRefreshTokenError,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { setAdminAuthCookie } from "@/lib/supabase/adminAuthCookie";
import {
  getDefaultRolePermissions,
  type PermissionKey,
  type UserRole,
} from "@/lib/roles";
import { DEFAULT_GRADES, getBadgeInfo, type GradeDefinition } from "@/lib/badges";
import { type LearningGoal, normalizeLearningGoal } from "@/lib/learning";

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
  learning_goal: LearningGoal;
  avatar_url: string | null;
  completedDailyGoals?: number;
  gradeBadge?: string | null;
  grades?: GradeDefinition[];
  gradeName?: string | null;
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

async function getSafeSession(
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
) {
  try {
    const result = await withTimeout(supabase.auth.getSession(), {
      data: { session: null },
      error: null,
    });

    if (isInvalidRefreshTokenError(result.error)) {
      clearSupabaseAuthStorage();

      return { data: { session: null }, error: null };
    }

    return result;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      clearSupabaseAuthStorage();
    }

    return { data: { session: null }, error: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());
  const sessionRef = useRef<Session | null>(null);

  const commitAuthState = useCallback(
    (nextSession: Session | null, nextProfile: UserProfile | null) => {
      setAdminAuthCookie(nextSession?.access_token ?? null);
      sessionRef.current = nextSession;
      setSession(nextSession);
      setProfile(nextProfile);
    },
    [],
  );

  const resolveProfile = useCallback(
    async (nextSession: Session | null): Promise<UserProfile | null> => {
      const supabase = createSupabaseBrowserClient();

      if (!supabase || !nextSession?.user) {
        return null;
      }

      const { data } = await withTimeout(
        supabase
          .from("profiles")
          .select("username,daily_goal,avatar_url,learning_goal,role")
          .eq("id", nextSession.user.id)
          .maybeSingle(),
        { data: null, error: null },
      );

      if (!data) {
        return null;
      }

      let permissions = getDefaultRolePermissions(data.role) as PermissionKey[];
      let roleName: string | null = null;
      let gradeBadge: string | null = null;
      let gradeName: string | null = null;
      let completedDailyGoals = 0;
      let grades: GradeDefinition[] = [];

      try {
        const [roleResult, completedGoalsResult, gradesResult] =
          await Promise.all([
            withTimeout(
              supabase
                .from("roles")
                .select("name,permissions")
                .eq("slug", data.role)
                .maybeSingle(),
              { data: null, error: null },
            ),
            withTimeout(
              supabase
                .from("user_daily_progress")
                .select("id", { count: "exact", head: true })
                .eq("user_id", nextSession.user.id)
                .eq("goal_completed", true),
              { count: 0, error: null },
            ),
            withTimeout(
              supabase
                .from("grades")
                .select("id,slug,name,required_goals,description,badge,display_order")
                .order("required_goals", { ascending: true })
                .order("display_order", { ascending: true }),
              { data: [], error: null },
            ),
          ]);

        const roleData = roleResult.data;

        if (roleData) {
          roleName = roleData.name;
          permissions = Array.isArray(roleData.permissions)
            ? (roleData.permissions.filter(
                (permission): permission is PermissionKey =>
                  typeof permission === "string",
              ) as PermissionKey[])
            : permissions;
        }

        grades = (gradesResult.data ?? []).map((grade) => ({
          badge: grade.badge,
          description: grade.description,
          displayOrder: grade.display_order,
          id: grade.id,
          name: grade.name,
          requiredGoals: grade.required_goals,
          slug: grade.slug,
        })) satisfies GradeDefinition[];
        if (grades.length === 0) {
          grades = DEFAULT_GRADES;
        }
        completedDailyGoals = completedGoalsResult.count ?? 0;
        const badge = getBadgeInfo(completedDailyGoals, grades);
        gradeBadge = badge.badge;
        gradeName = badge.title;
      } catch {
        permissions = getDefaultRolePermissions(data.role) as PermissionKey[];
        grades = DEFAULT_GRADES;
      }

      return {
        ...data,
        completedDailyGoals,
        gradeBadge,
        grades,
        gradeName,
        learning_goal: normalizeLearningGoal(data.learning_goal),
        permissions,
        roleName,
      };
    },
    [],
  );

  const refreshUser = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();

      if (!supabase) {
      commitAuthState(null, null);
      setIsLoading(false);
      return;
    }

    const { data } = await getSafeSession(supabase);
    const nextProfile = await resolveProfile(data.session);
    commitAuthState(data.session, nextProfile);
    setIsLoading(false);
  }, [commitAuthState, resolveProfile]);

  useEffect(() => {
    let isMounted = true;
    let requestId = 0;
    clearMalformedSupabaseAuthStorage();
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      window.setTimeout(() => setIsLoading(false), 0);
      return () => {
        isMounted = false;
      };
    }

    async function applySession(nextSession: Session | null, showLoading = false) {
      const currentRequestId = ++requestId;

      if (showLoading) {
        setIsLoading(true);
      }

      const nextProfile = await resolveProfile(nextSession);

      if (!isMounted || currentRequestId !== requestId) {
        return;
      }

      commitAuthState(nextSession, nextProfile);
      setIsLoading(false);
    }

    getSafeSession(supabase).then(async ({ data }) => {
      await applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "INITIAL_SESSION") {
        return;
      }

      if (!nextSession && event === "SIGNED_OUT") {
        clearSupabaseAuthStorage();
      }

      const currentSession = sessionRef.current;
      const isSameUser =
        Boolean(currentSession?.user?.id) &&
        currentSession?.user?.id === nextSession?.user?.id;

      if (event === "TOKEN_REFRESHED" || (event === "SIGNED_IN" && isSameUser)) {
        setAdminAuthCookie(nextSession?.access_token ?? null);
        setIsLoading(false);
        return;
      }

      void applySession(nextSession, event === "SIGNED_IN" || event === "SIGNED_OUT");
    });

    return () => {
      isMounted = false;
      requestId += 1;
      subscription.unsubscribe();
    };
  }, [commitAuthState, resolveProfile]);

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
