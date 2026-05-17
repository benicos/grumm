import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
    return "Ton email n'est pas encore confirme. Verifie ta boite mail.";
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
    return "Connexion impossible. Verifie ta connexion internet.";
  }

  if (normalizedMessage.includes("password")) {
    return "Le mot de passe doit contenir au moins 6 caracteres.";
  }

  if (normalizedMessage.includes("email")) {
    return "L'adresse email n'est pas valide.";
  }

  return "Une erreur est survenue. Reessaie dans quelques instants.";
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
      message: "Supabase n'est pas configure.",
      field: "global" as const,
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      message: getSupabaseErrorMessage(error.message),
      field: getSupabaseField(error.message),
    };
  }

  return { ok: true as const, available: !data };
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false, message: "Supabase n'est pas configure." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
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
): Promise<AuthResult> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false, message: "Supabase n'est pas configure." };
  }

  const username = normalizeUsername(usernameInput);
  const usernameError = getUsernameValidationMessage(username);

  if (usernameError) {
    return { ok: false, message: usernameError, field: "username" };
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
        username,
      },
    },
  });

  if (error) {
    return {
      ok: false,
      message: getSupabaseErrorMessage(error.message),
      field: getSupabaseField(error.message),
    };
  }

  if (data.user && data.session) {
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: data.user.id, username }, { onConflict: "id" });

    if (profileError) {
      return {
        ok: false,
        message: getSupabaseErrorMessage(profileError.message),
        field: getSupabaseField(profileError.message),
      };
    }
  }

  if (!data.session) {
    return {
      ok: true,
      requiresEmailConfirmation: true,
      message: "Compte cree. Confirme ton email avant de te connecter.",
    };
  }

  return { ok: true };
}

export async function signOut(): Promise<AuthResult> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false, message: "Supabase n'est pas configure." };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { ok: false, message: getSupabaseErrorMessage(error.message) };
  }

  return { ok: true };
}
