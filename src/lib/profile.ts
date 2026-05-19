import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { GradeDefinition } from "@/lib/badges";
import { formatAppError, getConfiguredErrorMessage } from "@/lib/errors";
import { FeedError, type FeedFact } from "@/lib/facts";
import type { UserRole } from "@/lib/roles";
import {
  getUsernameValidationMessage,
  normalizeUsername,
  slugify,
} from "@/lib/slug";

type RelatedFactRow = {
  fact_id: string;
  facts:
    | {
        id: string;
        slug?: string | null;
        title: string;
        hook: string;
        content: string;
        source: string;
        source_url?: string | null;
        tone: string | null;
        accent_color: string | null;
        categories:
          | {
              name: string;
              slug: string;
              tone: string;
              accent_color: string;
            }
          | {
              name: string;
              slug: string;
              tone: string;
              accent_color: string;
            }[]
          | null;
      }
    | null;
};

export type UserProfileSummary = {
  username: string | null;
  email: string | null;
  dailyGoal: number;
  role: UserRole;
  likedCount: number;
  savedCount: number;
  uniqueViewsCount: number;
  completedDailyGoals: number;
  grades: GradeDefinition[];
  todayReadCount: number;
  likedFacts: FeedFact[];
  savedFacts: FeedFact[];
};

export type ProfileField = "username" | "email" | "password" | "dailyGoal" | "global";

export type ProfileMutationResult =
  | { ok: true; message: string }
  | { ok: false; field: ProfileField; message: string };

function categoryFromRelation(fact: NonNullable<RelatedFactRow["facts"]>) {
  return Array.isArray(fact.categories)
    ? fact.categories[0]
    : fact.categories;
}

function mapRelatedFact(row: RelatedFactRow): FeedFact | null {
  const fact = row.facts;

  if (!fact) {
    return null;
  }

  const category = categoryFromRelation(fact);

  return {
    id: fact.id,
    slug: fact.slug || slugify(fact.title),
    category: category?.name ?? "General",
    categorySlug: category?.slug ?? "general",
    title: fact.title,
    hook: fact.hook,
    detail: fact.content,
    source: fact.source || "Source non renseignee",
    sourceUrl: fact.source_url ?? null,
    tone:
      fact.tone ??
      category?.tone ??
      "from-[#0b1424] via-[#132744] to-[#f0a95a]",
    accent: fact.accent_color ?? category?.accent_color ?? "#ffd166",
  };
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getProfileErrorMessage(error: unknown) {
  return formatAppError(error, {
    context: {
      operation: "read profile summary",
      source: "Supabase",
    },
    prodMessage: "Impossible de charger ton profil pour le moment.",
  });
}

const RELATED_FACT_SELECT =
  "fact_id,facts(id,slug,title,hook,content,source,source_url,tone,accent_color,categories(name,slug,tone,accent_color))";

export async function getUserProfileSummary(): Promise<UserProfileSummary> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new FeedError(getConfiguredErrorMessage());
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new FeedError("auth_required");
  }

  const [
    profileResult,
    likesResult,
    savesResult,
    viewsResult,
    dailyProgressResult,
    gradesResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,daily_goal,role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("likes")
      .select(RELATED_FACT_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("saves")
      .select(RELATED_FACT_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_fact_views")
      .select("fact_id")
      .eq("user_id", user.id),
    supabase
      .from("user_daily_progress")
      .select("progress_date,facts_read_count,daily_goal,goal_completed")
      .eq("user_id", user.id)
      .order("progress_date", { ascending: false }),
    supabase
      .from("grades")
      .select("id,slug,name,required_goals,description,badge,display_order")
      .order("required_goals", { ascending: true })
      .order("display_order", { ascending: true }),
  ]);

  const blockingError =
    profileResult.error ??
    likesResult.error ??
    savesResult.error ??
    viewsResult.error ??
    dailyProgressResult.error;

  if (blockingError) {
    throw new FeedError(getProfileErrorMessage(blockingError));
  }

  const likedFacts = ((likesResult.data ?? []) as RelatedFactRow[])
    .map(mapRelatedFact)
    .filter((fact): fact is FeedFact => Boolean(fact));
  const savedFacts = ((savesResult.data ?? []) as RelatedFactRow[])
    .map(mapRelatedFact)
    .filter((fact): fact is FeedFact => Boolean(fact));

  const uniqueViews = new Set(
    (viewsResult.data ?? []).map((view) => view.fact_id),
  );
  const dailyRows = dailyProgressResult.data ?? [];
  const grades = gradesResult.error
    ? []
    : (gradesResult.data ?? []).map((grade) => ({
        badge: grade.badge,
        description: grade.description,
        displayOrder: grade.display_order,
        id: grade.id,
        name: grade.name,
        requiredGoals: grade.required_goals,
        slug: grade.slug,
      }));
  const today = todayKey();
  const todayRow = dailyRows.find((row) => row.progress_date === today);

  return {
    username:
      profileResult.data?.username ??
      (typeof user.user_metadata?.username === "string"
        ? user.user_metadata.username
        : null),
    email: user.email ?? null,
    dailyGoal: profileResult.data?.daily_goal ?? 10,
    role: (profileResult.data?.role ?? "membre") as UserRole,
    likedCount: likedFacts.length,
    savedCount: savedFacts.length,
    uniqueViewsCount: uniqueViews.size,
    completedDailyGoals: dailyRows.filter((row) => row.goal_completed).length,
    grades,
    todayReadCount: todayRow?.facts_read_count ?? 0,
    likedFacts,
    savedFacts,
  };
}

async function getAuthenticatedProfileClient() {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return {
      ok: false as const,
      message: getConfiguredErrorMessage(),
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false as const,
      message: "Connecte-toi pour modifier ton profil.",
    };
  }

  return { ok: true as const, supabase, user };
}

function getProfileMutationError(
  error: unknown,
  field: ProfileField,
  prodMessage: string,
) {
  return {
    ok: false as const,
    field,
    message: formatAppError(error, {
      context: {
        operation: "update profile",
        source: "Supabase",
        table: "profiles",
      },
      prodMessage,
    }),
  };
}

export async function updateProfileSettings({
  dailyGoal,
  username,
}: {
  dailyGoal: number;
  username: string;
}): Promise<ProfileMutationResult> {
  const auth = await getAuthenticatedProfileClient();

  if (!auth.ok) {
    return { ok: false, field: "global", message: auth.message };
  }

  const normalizedUsername = normalizeUsername(username);
  const usernameMessage = getUsernameValidationMessage(normalizedUsername);

  if (usernameMessage) {
    return { ok: false, field: "username", message: usernameMessage };
  }

  if (!Number.isInteger(dailyGoal) || dailyGoal < 1 || dailyGoal > 100) {
    return {
      ok: false,
      field: "dailyGoal",
      message: "Choisis un objectif entre 1 et 100.",
    };
  }

  const { data: currentProfile, error: currentProfileError } = await auth.supabase
    .from("profiles")
    .select("username")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (currentProfileError) {
    return getProfileMutationError(
      currentProfileError,
      "username",
      "Nous n'avons pas pu vérifier ce pseudo.",
    );
  }

  if (currentProfile?.username !== normalizedUsername) {
    const { data: isAvailable, error: usernameError } = await auth.supabase.rpc(
      "is_username_available",
      {
        p_username: normalizedUsername,
      },
    );

    if (usernameError) {
      return getProfileMutationError(
        usernameError,
        "username",
        "Nous n'avons pas pu vérifier ce pseudo.",
      );
    }

    if (!isAvailable) {
      return {
        ok: false,
        field: "username",
        message: "Ce nom d'utilisateur est déjà pris.",
      };
    }
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update({
      daily_goal: dailyGoal,
      username: normalizedUsername,
    })
    .eq("id", auth.user.id);

  if (error) {
    return getProfileMutationError(
      error,
      "global",
      "Nous n'avons pas pu mettre ton profil à jour.",
    );
  }

  await auth.supabase.auth.updateUser({
    data: {
      username: normalizedUsername,
    },
  });

  return { ok: true, message: "Profil mis à jour." };
}

export async function updateProfileEmail(
  email: string,
): Promise<ProfileMutationResult> {
  const auth = await getAuthenticatedProfileClient();

  if (!auth.ok) {
    return { ok: false, field: "global", message: auth.message };
  }

  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return {
      ok: false,
      field: "email",
      message: "Entre une adresse email valide.",
    };
  }

  const { error } = await auth.supabase.auth.updateUser({
    email: email.trim(),
  });

  if (error) {
    return {
      ok: false,
      field: "email",
      message: formatAppError(error, {
        context: {
          operation: "update auth email",
          source: "Supabase Auth",
        },
        prodMessage: "Nous n'avons pas pu mettre ton email à jour.",
      }),
    };
  }

  return {
    ok: true,
    message: "Email mis à jour. Une confirmation peut être demandée.",
  };
}

export async function updateProfilePassword(
  password: string,
): Promise<ProfileMutationResult> {
  const auth = await getAuthenticatedProfileClient();

  if (!auth.ok) {
    return { ok: false, field: "global", message: auth.message };
  }

  if (password.length < 8) {
    return {
      ok: false,
      field: "password",
      message: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }

  const { error } = await auth.supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      ok: false,
      field: "password",
      message: formatAppError(error, {
        context: {
          operation: "update auth password",
          source: "Supabase Auth",
        },
        prodMessage: "Nous n'avons pas pu mettre ton mot de passe à jour.",
      }),
    };
  }

  return { ok: true, message: "Mot de passe mis à jour." };
}

export async function resetUserFactViews(): Promise<ProfileMutationResult> {
  const auth = await getAuthenticatedProfileClient();

  if (!auth.ok) {
    return { ok: false, field: "global", message: auth.message };
  }

  const today = todayKey();
  const [uniqueViewsResult, legacyViewsResult, todayProgressResult] =
    await Promise.all([
      auth.supabase
        .from("user_fact_views")
        .delete()
        .eq("user_id", auth.user.id),
      auth.supabase.from("views").delete().eq("user_id", auth.user.id),
      auth.supabase
        .from("user_daily_progress")
        .delete()
        .eq("user_id", auth.user.id)
        .eq("progress_date", today),
    ]);

  const error =
    uniqueViewsResult.error ??
    legacyViewsResult.error ??
    todayProgressResult.error;

  if (error) {
    return {
      ok: false,
      field: "global",
      message: formatAppError(error, {
        context: {
          operation: "reset user fact views",
          source: "Supabase",
          table: "user_fact_views",
        },
        prodMessage: "Nous n'avons pas pu réinitialiser tes vues.",
      }),
    };
  }

  return { ok: true, message: "Vues réinitialisées." };
}
