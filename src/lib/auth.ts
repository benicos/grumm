import {
  clearSupabaseAuthStorage,
  createSupabaseBrowserClient,
  isInvalidRefreshTokenError,
} from "@/lib/supabase/client";
import { dailyGoalConfig } from "@/config/app";
import { formatAppError, getConfiguredErrorMessage } from "@/lib/errors";
import { logSupabaseError } from "@/lib/logger";
import {
  DEFAULT_LEARNING_GOAL,
  type LearningGoal,
  normalizeLearningGoal,
} from "@/lib/learning";
import { isPasswordValid, passwordValidationMessage } from "@/lib/password";
import {
  getUsernameValidationMessage,
  normalizeUsername,
} from "@/lib/slug";

export type AuthResult =
  | { ok: true; message?: string; requiresEmailConfirmation?: boolean }
  | {
      ok: false;
      message: string;
      field?: "username" | "email" | "password" | "global";
    };

export function getSupabaseErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (message === "supabase_unconfigured") {
    return getConfiguredErrorMessage();
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }

  if (
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("already exists")
  ) {
    return "Un compte existe deja avec cet email.";
  }

  if (
    normalizedMessage.includes("duplicate key") ||
    normalizedMessage.includes("profiles_username") ||
    normalizedMessage.includes("username")
  ) {
    return "Ce nom d'utilisateur est deja pris.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Ton email n’est pas encore confirmé. Vérifie ta boîte mail.";
  }

  if (normalizedMessage.includes("signup is disabled")) {
    return "Les inscriptions sont temporairement desactivees.";
  }

  if (normalizedMessage.includes("rate limit")) {
    return "Trop de tentatives. Attends un moment avant de reessayer.";
  }

  if (
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("failed to fetch")
  ) {
    return "Connexion impossible. Vérifie ta connexion internet.";
  }

  if (normalizedMessage.includes("password")) {
    return passwordValidationMessage;
  }

  if (normalizedMessage.includes("email")) {
    return "L'adresse email n'est pas valide.";
  }

  return "Impossible de finaliser cette action pour le moment.";
}

function getSupabaseField(message: string): "username" | "email" | "password" | "global" {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("username") ||
    normalizedMessage.includes("profiles_username") ||
    normalizedMessage.includes("duplicate key")
  ) {
    return "username";
  }

  if (normalizedMessage.includes("invalid login credentials")) {
    return "global";
  }

  if (
    normalizedMessage.includes("email") ||
    normalizedMessage.includes("already registered")
  ) {
    return "email";
  }

  if (normalizedMessage.includes("password")) {
    return "password";
  }

  return "global";
}

async function isUsernameAvailable(username: string) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return {
      ok: false as const,
      message: getConfiguredErrorMessage(),
      field: "global" as const,
    };
  }

  const { data, error } = await supabase.rpc("is_username_available", {
    p_username: username,
  });

  if (error) {
    return {
      ok: false as const,
      message: formatAppError(error, {
        context: {
          operation: "check username availability",
          source: "Supabase",
          table: "profiles",
        },
        prodMessage: getSupabaseErrorMessage(error.message),
      }),
      field: getSupabaseField(error.message),
    };
  }

  return { ok: true as const, available: Boolean(data) };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false, message: getSupabaseErrorMessage("supabase_unconfigured") };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logSupabaseError(error, {
      operation: "sign in with email",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    return {
      ok: false,
      message: getSupabaseErrorMessage(error.message),
      field: getSupabaseField(error.message),
    };
  }

  return { ok: true };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  usernameInput: string,
  learningGoalInput: LearningGoal = DEFAULT_LEARNING_GOAL,
  dailyGoalInput: number = dailyGoalConfig.defaultGoal,
): Promise<AuthResult> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false, message: getSupabaseErrorMessage("supabase_unconfigured") };
  }

  const username = normalizeUsername(usernameInput);
  const learningGoal = normalizeLearningGoal(learningGoalInput);
  const dailyGoal = Number.isInteger(dailyGoalInput)
    ? Math.min(
        Math.max(dailyGoalInput, dailyGoalConfig.minGoal),
        dailyGoalConfig.maxGoal,
      )
    : dailyGoalConfig.defaultGoal;
  const usernameError = getUsernameValidationMessage(username);

  if (usernameError) {
    return { ok: false, message: usernameError, field: "username" };
  }

  if (!isPasswordValid(password)) {
    return { ok: false, message: passwordValidationMessage, field: "password" };
  }

  const availability = await isUsernameAvailable(username);

  if (!availability.ok) {
    return {
      ok: false,
      message: availability.message,
      field: availability.field ?? "global",
    };
  }

  if (!availability.available) {
    return {
      ok: false,
      message: "Ce nom d'utilisateur est deja pris.",
      field: "username",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        daily_goal: dailyGoal,
        learning_goal: learningGoal,
        username,
      },
    },
  });

  if (error) {
    logSupabaseError(error, {
      operation: "signup",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    return {
      ok: false,
      message: getSupabaseErrorMessage(error.message),
      field: getSupabaseField(error.message),
    };
  }

  if (data.user && data.session) {
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          daily_goal: dailyGoal,
          id: data.user.id,
          learning_goal: learningGoal,
          username,
        },
        { onConflict: "id" },
      );

    if (profileError) {
      return {
        ok: false,
        message: formatAppError(profileError, {
          context: {
            operation: "create profile after signup",
            source: "Supabase",
            table: "profiles",
          },
          prodMessage: getSupabaseErrorMessage(profileError.message),
        }),
        field: getSupabaseField(profileError.message),
      };
    }
  }

  if (!data.session) {
    return {
      ok: true,
      requiresEmailConfirmation: true,
      message: "Compte créé. Confirme ton email avant de te connecter.",
    };
  }

  return { ok: true };
}

export async function signOut(): Promise<AuthResult> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false, message: getSupabaseErrorMessage("supabase_unconfigured") };
  }

  const { error } = await supabase.auth.signOut();
  clearSupabaseAuthStorage();

  if (error && !isInvalidRefreshTokenError(error)) {
    logSupabaseError(error, {
      operation: "sign out",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    return { ok: false, message: getSupabaseErrorMessage(error.message) };
  }

  return { ok: true };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false, message: getSupabaseErrorMessage("supabase_unconfigured") };
  }

  const normalizedEmail = email.trim();

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return {
      ok: false,
      message: "Entre une adresse email valide.",
      field: "email",
    };
  }

  const redirectTo =
    typeof window === "undefined"
      ? undefined
      : `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });

  if (error) {
    logSupabaseError(error, {
      operation: "request password reset",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    return {
      ok: false,
      message: getSupabaseErrorMessage(error.message),
      field: getSupabaseField(error.message),
    };
  }

  return {
    ok: true,
    message: "Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.",
  };
}

export async function updatePasswordAfterReset(password: string): Promise<AuthResult> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false, message: getSupabaseErrorMessage("supabase_unconfigured") };
  }

  if (!isPasswordValid(password)) {
    return {
      ok: false,
      message: passwordValidationMessage,
      field: "password",
    };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    logSupabaseError(sessionError, {
      operation: "read password reset session",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }

  if (!session) {
    return {
      ok: false,
      message: "Ce lien a expiré. Demande un nouveau lien de réinitialisation.",
      field: "global",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    logSupabaseError(error, {
      operation: "update password after reset",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    return {
      ok: false,
      message: getSupabaseErrorMessage(error.message),
      field: getSupabaseField(error.message),
    };
  }

  return {
    ok: true,
    message: "Mot de passe mis à jour.",
  };
}
