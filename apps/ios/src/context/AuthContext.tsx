import type { Session } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

import { mobileConfig, userMessages } from "../config/app";
import type { SessionProfile } from "../types/domain";
import { trackMobileAnalyticsEvent } from "../lib/analytics";
import { DEFAULT_LEARNING_GOAL, normalizeLearningGoal, type LearningGoal } from "../lib/learning";
import { getUsernameValidationMessage, normalizeUsername } from "../lib/slug";
import { clearSupabaseAuthStorage, getSupabaseClient, withSupabaseTimeout } from "../lib/supabase";

type AuthContextValue = {
  error: string | null;
  isLoading: boolean;
  profile: SessionProfile | null;
  refreshProfile: () => Promise<void>;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, username: string, learningGoal: LearningGoal) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function isInvalidRefreshTokenError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return message.includes("invalid refresh token") || message.includes("refresh token not found");
}

function getAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (isInvalidRefreshTokenError(error)) {
    return null;
  }

  if (message.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }

  if (message.includes("already") || message.includes("exists")) {
    return "Un compte existe déjà avec cet email.";
  }

  if (message.includes("rate limit")) {
    return "Trop de tentatives. Attends un moment avant de réessayer.";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "Connexion impossible. Vérifie ta connexion internet.";
  }

  return userMessages.genericLoadError;
}

async function recoverFromInvalidSession() {
  const supabase = getSupabaseClient();

  await clearSupabaseAuthStorage();
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
}

async function resolveProfile(session: Session | null): Promise<SessionProfile | null> {
  if (!session?.user) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("profiles")
      .select("username,daily_goal,learning_goal,role,created_at")
      .eq("id", session.user.id)
      .maybeSingle(),
  );

  if (error) {
    throw new Error(userMessages.genericLoadError);
  }

  return {
    createdAt: data?.created_at ?? session.user.created_at ?? null,
    dailyGoal: data?.daily_goal ?? mobileConfig.dailyGoal,
    email: session.user.email ?? null,
    id: session.user.id,
    learningGoal: normalizeLearningGoal(data?.learning_goal),
    role: data?.role ?? "membre",
    username: data?.username ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let bootstrapped = false;
    let isRecoveringInvalidSession = false;

    async function handleInvalidSession() {
      if (isRecoveringInvalidSession) {
        return;
      }

      isRecoveringInvalidSession = true;
      try {
        await recoverFromInvalidSession();

        if (isMounted) {
          setSession(null);
          setProfile(null);
          setError(null);
          setIsLoading(false);
        }
      } finally {
        isRecoveringInvalidSession = false;
      }
    }

    async function bootstrap() {
      try {
        const supabase = getSupabaseClient();
        const { data, error: sessionError } = await withSupabaseTimeout(
          supabase.auth.getSession(),
          "La session met trop de temps à répondre.",
        );

        if (sessionError) {
          if (isInvalidRefreshTokenError(sessionError)) {
            await handleInvalidSession();
            return;
          }

          throw sessionError;
        }

        const nextProfile = await resolveProfile(data.session);

        if (!isMounted) {
          return;
        }

        setSession(data.session);
        setProfile(nextProfile);
        setError(null);
      } catch (nextError) {
        if (isMounted) {
          setError(getAuthErrorMessage(nextError));
          setSession(null);
          setProfile(null);
        }
      } finally {
        bootstrapped = true;
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    let subscription:
      | ReturnType<ReturnType<typeof getSupabaseClient>["auth"]["onAuthStateChange"]>["data"]["subscription"]
      | null = null;

    try {
      const supabase = getSupabaseClient();
      supabase.auth.startAutoRefresh();
      subscription = supabase.auth.onAuthStateChange(async (event, nextSession) => {
        if (!bootstrapped && event === "INITIAL_SESSION") {
          return;
        }

        try {
          if (!isMounted) {
            return;
          }

          setSession(nextSession);
          setProfile(await resolveProfile(nextSession));
          setError(null);
        } catch (nextError) {
          if (isInvalidRefreshTokenError(nextError)) {
            await handleInvalidSession();
            return;
          }

          if (isMounted) {
            setError(getAuthErrorMessage(nextError));
          }
        }
      }).data.subscription;

      const appStateSubscription = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          supabase.auth.startAutoRefresh();
          void withSupabaseTimeout(supabase.auth.getSession())
            .then(({ error: sessionError }) => {
              if (sessionError && isInvalidRefreshTokenError(sessionError)) {
                void handleInvalidSession();
              }
            })
            .catch((nextError) => {
              if (isInvalidRefreshTokenError(nextError)) {
                void handleInvalidSession();
              }
            });
        } else {
          supabase.auth.stopAutoRefresh();
        }
      });

      return () => {
        isMounted = false;
        subscription?.unsubscribe();
        appStateSubscription.remove();
        supabase.auth.stopAutoRefresh();
      };
    } catch (nextError) {
      setTimeout(() => {
        setError(getAuthErrorMessage(nextError));
        setIsLoading(false);
      }, 0);
    }

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      isLoading,
      profile,
      refreshProfile: async () => {
        try {
          setProfile(await resolveProfile(session));
        } catch (nextError) {
          if (isInvalidRefreshTokenError(nextError)) {
            await recoverFromInvalidSession();
            setSession(null);
            setProfile(null);
            setError(null);
            return;
          }

          throw nextError;
        }
      },
      session,
      signIn: async (email, password) => {
        const supabase = getSupabaseClient();
        const { data, error: signInError } = await withSupabaseTimeout(
          supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          }),
        );

        if (signInError) {
          if (isInvalidRefreshTokenError(signInError)) {
            await recoverFromInvalidSession();
            setSession(null);
            setProfile(null);
          }

          throw new Error(getAuthErrorMessage(signInError) ?? "Reconnecte-toi pour continuer.");
        }

        setSession(data.session);
        setProfile(await resolveProfile(data.session));
        void trackMobileAnalyticsEvent({ eventName: "login_completed" });
      },
      signOut: async () => {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut().catch(() => undefined);
        await clearSupabaseAuthStorage();
        setSession(null);
        setProfile(null);
      },
      signUp: async (email, password, usernameInput, learningGoalInput) => {
        const supabase = getSupabaseClient();
        const username = normalizeUsername(usernameInput);
        const learningGoal = normalizeLearningGoal(learningGoalInput ?? DEFAULT_LEARNING_GOAL);
        const usernameMessage = getUsernameValidationMessage(username);

        if (usernameMessage) {
          throw new Error(usernameMessage);
        }

        const { data: isAvailable, error: usernameError } = await withSupabaseTimeout(
          supabase.rpc("is_username_available", {
            p_username: username,
          }),
        );

        if (usernameError) {
          throw new Error("Nous n'avons pas pu vérifier ce pseudo.");
        }

        if (!isAvailable) {
          throw new Error("Ce nom d'utilisateur est déjà pris.");
        }

        const { data, error: signUpError } = await withSupabaseTimeout(
          supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                learning_goal: learningGoal,
                username,
              },
            },
          }),
        );

        if (signUpError) {
          throw new Error(getAuthErrorMessage(signUpError) ?? "Inscription impossible pour le moment.");
        }

        if (data.user && data.session) {
          const { error: profileError } = await withSupabaseTimeout(
            supabase
              .from("profiles")
              .upsert({ id: data.user.id, learning_goal: learningGoal, username }, { onConflict: "id" }),
          );

          if (profileError) {
            throw new Error("Nous n'avons pas pu finaliser ton profil.");
          }
        }

        setSession(data.session);
        setProfile(await resolveProfile(data.session));
        void trackMobileAnalyticsEvent({ eventName: "signup_completed" });
      },
    }),
    [error, isLoading, profile, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
