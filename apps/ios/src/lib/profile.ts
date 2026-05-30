import { mobileConfig } from "../config/app";
import { normalizeLearningGoal, type LearningGoal } from "./learning";
import { getUsernameValidationMessage, normalizeUsername } from "./slug";
import { getSupabaseClient } from "./supabase";

export type ProfileField = "dailyGoal" | "email" | "global" | "learningGoal" | "password" | "username";

export type ProfileMutationResult =
  | { ok: true; message: string }
  | { ok: false; field: ProfileField; message: string };

async function getAuthenticatedClient() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      message: "Connecte-toi pour modifier ton profil.",
    };
  }

  return { ok: true as const, supabase, user };
}

function humanUpdateError(field: ProfileField, message: string): ProfileMutationResult {
  return { field, message, ok: false };
}

export async function updateProfileSettings({
  dailyGoal,
  learningGoal,
  username,
}: {
  dailyGoal: number;
  learningGoal: LearningGoal;
  username: string;
}): Promise<ProfileMutationResult> {
  const auth = await getAuthenticatedClient();

  if (!auth.ok) {
    return humanUpdateError("global", auth.message);
  }

  const normalizedUsername = normalizeUsername(username);
  const normalizedLearningGoal = normalizeLearningGoal(learningGoal);
  const usernameMessage = getUsernameValidationMessage(normalizedUsername);

  if (usernameMessage) {
    return humanUpdateError("username", usernameMessage);
  }

  if (
    !Number.isInteger(dailyGoal) ||
    dailyGoal < mobileConfig.dailyGoalMin ||
    dailyGoal > mobileConfig.dailyGoalMax
  ) {
    return humanUpdateError(
      "dailyGoal",
      `Choisis un objectif entre ${mobileConfig.dailyGoalMin} et ${mobileConfig.dailyGoalMax}.`,
    );
  }

  const { data: currentProfile, error: currentProfileError } = await auth.supabase
    .from("profiles")
    .select("username")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (currentProfileError) {
    return humanUpdateError("username", "Nous n'avons pas pu vérifier ce pseudo.");
  }

  if (currentProfile?.username !== normalizedUsername) {
    const { data: isAvailable, error: usernameError } = await auth.supabase.rpc("is_username_available", {
      p_username: normalizedUsername,
    });

    if (usernameError) {
      return humanUpdateError("username", "Nous n'avons pas pu vérifier ce pseudo.");
    }

    if (!isAvailable) {
      return humanUpdateError("username", "Ce nom d'utilisateur est déjà pris.");
    }
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update({
      daily_goal: dailyGoal,
      learning_goal: normalizedLearningGoal,
      username: normalizedUsername,
    })
    .eq("id", auth.user.id);

  if (error) {
    return humanUpdateError("global", "Nous n'avons pas pu mettre ton profil à jour.");
  }

  await auth.supabase.auth.updateUser({
    data: {
      username: normalizedUsername,
      learning_goal: normalizedLearningGoal,
    },
  });

  return { message: "Profil mis à jour.", ok: true };
}

export async function updateProfileEmail(email: string): Promise<ProfileMutationResult> {
  const auth = await getAuthenticatedClient();

  if (!auth.ok) {
    return humanUpdateError("global", auth.message);
  }

  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return humanUpdateError("email", "Entre une adresse email valide.");
  }

  const { error } = await auth.supabase.auth.updateUser({
    email: email.trim(),
  });

  if (error) {
    return humanUpdateError("email", "Nous n'avons pas pu mettre ton email à jour.");
  }

  return {
    message: "Email mis à jour. Une confirmation peut être demandée.",
    ok: true,
  };
}

export async function updateProfilePassword(password: string): Promise<ProfileMutationResult> {
  const auth = await getAuthenticatedClient();

  if (!auth.ok) {
    return humanUpdateError("global", auth.message);
  }

  if (password.length < 8) {
    return humanUpdateError("password", "Le mot de passe doit contenir au moins 8 caractères.");
  }

  const { error } = await auth.supabase.auth.updateUser({
    password,
  });

  if (error) {
    return humanUpdateError("password", "Nous n'avons pas pu mettre ton mot de passe à jour.");
  }

  return { message: "Mot de passe mis à jour.", ok: true };
}
