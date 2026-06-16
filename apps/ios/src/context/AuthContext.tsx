import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { mobileConfig, userMessages } from "../config/app";
import type { SessionProfile } from "../types/domain";
import { trackMobileAnalyticsEvent } from "../lib/analytics";
import { DEFAULT_LEARNING_GOAL, normalizeLearningGoal, type LearningGoal } from "../lib/learning";
import { getUsernameValidationMessage, normalizeUsername } from "../lib/slug";
import {
  clearMalformedSupabaseAuthStorage,
  clearSupabaseAuthStorage,
  getSupabaseClient,
  isInvalidRefreshTokenError,
  isSupabaseRequestTimeout,
  measureSupabaseStoredSession,
  withSupabaseTimeout,
} from "../lib/supabase";
import { checkUsernameAvailability } from "../lib/usernames";

type AuthContextValue = {
  error: string | null;
  isLoading: boolean;
  profile: SessionProfile | null;
  refreshProfile: () => Promise<void>;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (
    email: string,
    password: string,
    username: string,
    learningGoal: LearningGoal,
    dailyGoal?: number,
  ) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_CONFIG_ERROR = "Connexion impossible pour le moment. La configuration de l'app doit être vérifiée.";
const AUTH_NETWORK_ERROR = "Connexion impossible pour le moment. Vérifie ta connexion internet puis réessaie.";

const AUTH_SESSION_TIMEOUT = "La session met trop de temps à répondre.";

type ProfileRow = {
  created_at: string | null;
  daily_goal: number | null;
  learning_goal: string | null;
  role: string | null;
  username: string | null;
} | null;

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

  if (message.includes("configuration") || message.includes("config")) {
    return AUTH_CONFIG_ERROR;
  }

  if (message.includes("session met trop")) {
    return AUTH_SESSION_TIMEOUT;
  }

  if (message.includes("network") || message.includes("fetch")) {
    return AUTH_NETWORK_ERROR;
  }

  return userMessages.genericLoadError;
}

async function recoverFromInvalidSession() {
  await clearSupabaseAuthStorage();
}

function buildSessionProfile(session: Session, row: ProfileRow = null): SessionProfile {
  return {
    createdAt: row?.created_at ?? session.user.created_at ?? null,
    dailyGoal: row?.daily_goal ?? mobileConfig.dailyGoal,
    email: session.user.email ?? null,
    id: session.user.id,
    learningGoal: normalizeLearningGoal(row?.learning_goal),
    role: row?.role ?? "membre",
    username:
      row?.username ??
      (typeof session.user.user_metadata?.username === "string"
        ? session.user.user_metadata.username
        : null),
  };
}

async function resolveProfile(session: Session | null, strict = false): Promise<SessionProfile | null> {
  if (!session?.user) {
    return null;
  }

  const supabase = getSupabaseClient();

  try {
    const { data, error } = await withSupabaseTimeout(
      supabase
        .from("profiles")
        .select("username,daily_goal,learning_goal,role,created_at")
        .eq("id", session.user.id)
        .maybeSingle(),
      userMessages.genericLoadError,
      10000,
      "profiles.select",
    );

    if (error) {
      throw error;
    }

    return buildSessionProfile(session, data);
  } catch (nextError) {
    if (strict) {
      throw nextError;
    }

    return buildSessionProfile(session);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const profileRef = useRef<SessionProfile | null>(null);
  const profileRequestRef = useRef<{
    promise: Promise<SessionProfile | null>;
    userId: string;
  } | null>(null);

  const commitAuthState = useCallback((nextSession: Session | null, nextProfile: SessionProfile | null) => {
    sessionRef.current = nextSession;
    profileRef.current = nextProfile;
    setSession(nextSession);
    setProfile(nextProfile);
  }, []);

  const loadProfileOnce = useCallback((nextSession: Session | null, strict = true) => {
    if (!nextSession?.user) {
      return Promise.resolve(null);
    }

    const currentRequest = profileRequestRef.current;

    if (currentRequest?.userId === nextSession.user.id) {
      return currentRequest.promise;
    }

    const promise = resolveProfile(nextSession, strict).finally(() => {
      if (profileRequestRef.current?.promise === promise) {
        profileRequestRef.current = null;
      }
    });

    profileRequestRef.current = {
      promise,
      userId: nextSession.user.id,
    };

    return promise;
  }, []);

  useEffect(() => {
    let isMounted = true;
    let bootstrapped = false;
    let isRecoveringInvalidSession = false;
    let subscription:
      | ReturnType<ReturnType<typeof getSupabaseClient>["auth"]["onAuthStateChange"]>["data"]["subscription"]
      | null = null;
    let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
    let supabase: ReturnType<typeof getSupabaseClient> | null = null;

    async function handleInvalidSession() {
      if (isRecoveringInvalidSession) {
        return;
      }

      isRecoveringInvalidSession = true;
      try {
        await recoverFromInvalidSession();

        if (isMounted) {
          commitAuthState(null, null);
          setError(null);
          setIsLoading(false);
        }
      } finally {
        isRecoveringInvalidSession = false;
      }
    }

    async function applyResolvedSession(nextSession: Session | null, strictProfile = true) {
      if (!nextSession?.user) {
        commitAuthState(null, null);
        setError(null);
        return;
      }

      sessionRef.current = nextSession;
      setSession(nextSession);

      const nextProfile = await loadProfileOnce(nextSession, strictProfile);

      if (!isMounted) {
        return;
      }

      commitAuthState(nextSession, nextProfile);
      setError(null);
    }

    function attachAuthListeners(nextSupabase: ReturnType<typeof getSupabaseClient>) {
      subscription = nextSupabase.auth.onAuthStateChange(async (event, nextSession) => {
        if (!bootstrapped || event === "INITIAL_SESSION") {
          return;
        }

        if (!nextSession || event === "SIGNED_OUT") {
          if (event === "SIGNED_OUT") {
            await clearSupabaseAuthStorage();
          }
          if (isMounted) {
            commitAuthState(null, null);
            setError(null);
          }
          return;
        }

        const isSameUser = sessionRef.current?.user.id === nextSession.user.id;

        if (event === "TOKEN_REFRESHED" || (event === "SIGNED_IN" && isSameUser)) {
          if (isMounted) {
            commitAuthState(nextSession, profileRef.current);
            setError(null);
          }
          return;
        }

        try {
          await applyResolvedSession(nextSession, true);
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

      appStateSubscription = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          if (!bootstrapped || !sessionRef.current) {
            return;
          }

          nextSupabase.auth.startAutoRefresh();
          void withSupabaseTimeout(
            nextSupabase.auth.getSession(),
            AUTH_SESSION_TIMEOUT,
            undefined,
            "auth.getSession.resume",
            { logError: false },
          )
            .then(async ({ data, error: sessionError }) => {
              if (sessionError && isInvalidRefreshTokenError(sessionError)) {
                await handleInvalidSession();
                return;
              }

              if (!data.session) {
                await handleInvalidSession();
              }
            })
            .catch((nextError) => {
              if (isInvalidRefreshTokenError(nextError)) {
                void handleInvalidSession();
              }
            });
        } else if (sessionRef.current) {
          nextSupabase.auth.stopAutoRefresh();
        }
      });
    }

    async function bootstrap() {
      const storedSession = await measureSupabaseStoredSession().catch(() => null);

      try {
        supabase = getSupabaseClient();
        await clearMalformedSupabaseAuthStorage();
        const refreshedStoredSession = await measureSupabaseStoredSession();
        const { data, error: sessionError } = await withSupabaseTimeout(
          supabase.auth.getSession(),
          AUTH_SESSION_TIMEOUT,
          undefined,
          "auth.getSession",
        );

        if (sessionError) {
          if (isInvalidRefreshTokenError(sessionError)) {
            await handleInvalidSession();
            return;
          }

          throw sessionError;
        }

        await applyResolvedSession(data.session, true);

        if (data.session) {
          supabase.auth.startAutoRefresh();
        }

        if (!data.session && !refreshedStoredSession.hasLocalSession) {
          setError(null);
        }
      } catch (nextError) {
        if (isInvalidRefreshTokenError(nextError)) {
          await handleInvalidSession();
          return;
        }

        if (
          isSupabaseRequestTimeout(nextError) &&
          (storedSession?.isExpired || storedSession?.refreshLikelyNeeded)
        ) {
          await handleInvalidSession();
          return;
        }

        if (isSupabaseRequestTimeout(nextError) && storedSession?.hasLocalSession === false) {
          if (isMounted) {
            commitAuthState(null, null);
            setError(null);
          }
          return;
        }

        if (isMounted) {
          setError(getAuthErrorMessage(nextError));
          commitAuthState(null, null);
        }
      } finally {
        bootstrapped = true;
        if (isMounted) {
          setIsLoading(false);
          if (supabase) {
            attachAuthListeners(supabase);
          }
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      appStateSubscription?.remove();
      supabase?.auth.stopAutoRefresh();
    };
  }, [commitAuthState, loadProfileOnce]);

  const value = useMemo<AuthContextValue>(
    () => ({
      error,
      isLoading,
      profile,
      refreshProfile: async () => {
        try {
          const nextProfile = await loadProfileOnce(session, true);
          profileRef.current = nextProfile;
          setProfile(nextProfile);
        } catch (nextError) {
          if (isInvalidRefreshTokenError(nextError)) {
            await recoverFromInvalidSession();
            commitAuthState(null, null);
            setError(null);
            return;
          }

          throw nextError;
        }
      },
      session,
      signIn: async (email, password) => {
        try {
          const supabase = getSupabaseClient();
          const { data, error: signInError } = await withSupabaseTimeout(
            supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            }),
            AUTH_NETWORK_ERROR,
            undefined,
            "auth.signInWithPassword",
          );

          if (signInError) {
            if (isInvalidRefreshTokenError(signInError)) {
              await recoverFromInvalidSession();
              commitAuthState(null, null);
            }

            throw new Error(getAuthErrorMessage(signInError) ?? "Reconnecte-toi pour continuer.");
          }

          const nextProfile = await loadProfileOnce(data.session, true);
          commitAuthState(data.session, nextProfile);
          void trackMobileAnalyticsEvent({ eventName: "login_completed" });
        } catch (nextError) {
          throw new Error(getAuthErrorMessage(nextError) ?? userMessages.genericLoadError);
        }
      },
      signOut: async () => {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut().catch(() => undefined);
        await clearSupabaseAuthStorage();
        commitAuthState(null, null);
      },
      signUp: async (email, password, usernameInput, learningGoalInput, dailyGoalInput) => {
        const supabase = getSupabaseClient();
        const username = normalizeUsername(usernameInput);
        const learningGoal = normalizeLearningGoal(learningGoalInput ?? DEFAULT_LEARNING_GOAL);
        const dailyGoal = Math.max(
          mobileConfig.dailyGoalMin,
          Math.min(mobileConfig.dailyGoalMax, dailyGoalInput ?? mobileConfig.dailyGoal),
        );
        const usernameMessage = getUsernameValidationMessage(username);

        if (usernameMessage) {
          throw new Error(usernameMessage);
        }

        const isAvailable = await checkUsernameAvailability(supabase, username);

        if (!isAvailable) {
          throw new Error("Ce pseudo est déjà utilisé.");
        }

        const { data, error: signUpError } = await withSupabaseTimeout(
          supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                learning_goal: learningGoal,
                daily_goal: dailyGoal,
                username,
              },
            },
          }),
          userMessages.genericLoadError,
          undefined,
          "auth.signUp",
        );

        if (signUpError) {
          throw new Error(getAuthErrorMessage(signUpError) ?? "Inscription impossible pour le moment.");
        }

        if (data.user && data.session) {
          const { error: profileError } = await withSupabaseTimeout(
            supabase
              .from("profiles")
              .upsert(
                { daily_goal: dailyGoal, id: data.user.id, learning_goal: learningGoal, username },
                { onConflict: "id" },
              ),
            userMessages.genericLoadError,
            undefined,
            "profiles.upsert.signup",
          );

          if (profileError) {
            throw new Error("Nous n'avons pas pu finaliser ton profil.");
          }
        }

        const nextProfile = await loadProfileOnce(data.session, true);
        commitAuthState(data.session, nextProfile);
        void trackMobileAnalyticsEvent({ eventName: "signup_completed" });
      },
    }),
    [commitAuthState, error, isLoading, loadProfileOnce, profile, session],
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
