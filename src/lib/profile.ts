import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { dailyGoalConfig } from "@/config/app";
import type { GradeDefinition } from "@/lib/badges";
import {
  isCommercialCollaborationFact,
  isCommercialCollaborationSlug,
} from "@/lib/commercial";
import { formatAppError, getConfiguredErrorMessage } from "@/lib/errors";
import { cleanFactSource, FeedError, type FeedFact } from "@/lib/facts";
import { logSupabaseError } from "@/lib/logger";
import {
  type LearningGoal,
  normalizeDifficultyLevel,
  normalizeLearningGoal,
} from "@/lib/learning";
import {
  getMemoryChallengeStats,
  type MemoryStats,
} from "@/lib/memoryChallenge";
import { isPasswordValid, passwordValidationMessage } from "@/lib/password";
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
        hook: string | null;
        content: string;
        difficulty_level?: string | null;
        long_content?: string | null;
        source: string | null;
        source_url?: string | null;
        tone: string | null;
        accent_color: string | null;
        categories:
          | {
              name: string;
              slug: string;
              tone: string;
              accent_color: string;
              theme_icon?: string | null;
              visual_motif?: string | null;
            }
          | {
              name: string;
              slug: string;
              tone: string;
              accent_color: string;
              theme_icon?: string | null;
              visual_motif?: string | null;
            }[]
          | null;
      }
    | null;
};

type ViewedFactRow = {
  fact_id: string;
  facts:
    | {
        category_id: string | null;
        categories:
          | {
              id: string;
              name: string;
              slug: string;
              tone: string;
              accent_color: string;
              theme_icon?: string | null;
              visual_motif?: string | null;
            }
          | {
              id: string;
              name: string;
              slug: string;
              tone: string;
              accent_color: string;
              theme_icon?: string | null;
              visual_motif?: string | null;
            }[]
          | null;
      }
    | null;
};

export type ThemeViewStat = {
  accent: string;
  count: number;
  name: string;
  percent: number;
  slug: string;
  themeIcon: string | null;
  visualMotif: string | null;
};

export type UserProfileSummary = {
  username: string | null;
  email: string | null;
  createdAt: string | null;
  dailyGoal: number;
  learningGoal: LearningGoal;
  role: UserRole;
  savedCount: number;
  uniqueViewsCount: number;
  completedDailyGoals: number;
  currentStreakDays: number;
  bestDailyStreakDays: number;
  perfectQuizCount: number;
  weeklyDailyProgress: WeeklyDailyProgressDay[];
  grades: GradeDefinition[];
  todayReadCount: number;
  savedFacts: FeedFact[];
  topThemes: ThemeViewStat[];
  memoryStats: MemoryStats;
};

export type WeeklyDailyProgressDay = {
  date: string;
  label: string;
  readCount: number;
  goal: number;
  status: "completed" | "current" | "missed" | "pending";
};

export type ProfileField =
  | "username"
  | "email"
  | "password"
  | "currentPassword"
  | "passwordConfirmation"
  | "dailyGoal"
  | "learningGoal"
  | "global";

export type ProfileMutationResult =
  | { ok: true; message: string }
  | { ok: false; field: ProfileField; message: string };

export type UserThemeProgress = Record<string, number>;

function categoryFromRelation(fact: NonNullable<RelatedFactRow["facts"]>) {
  return Array.isArray(fact.categories)
    ? fact.categories[0]
    : fact.categories;
}

function getCurrentDailyGoalStreak(
  rows: { goal_completed: boolean; progress_date: string }[],
) {
  const completedDates = new Set(
    rows
      .filter((row) => row.goal_completed)
      .map((row) => row.progress_date),
  );
  const cursor = new Date();
  const today = todayKey();

  if (!completedDates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;

  while (true) {
    const key = cursor.toISOString().slice(0, 10);

    if (!completedDates.has(key)) {
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getBestDailyGoalStreak(
  rows: { goal_completed: boolean; progress_date: string }[],
) {
  const completedDates = [
    ...new Set(
      rows
        .filter((row) => row.goal_completed)
        .map((row) => row.progress_date),
    ),
  ].sort();
  let bestStreak = 0;
  let runningStreak = 0;
  let previousTime: number | null = null;
  const oneDay = 24 * 60 * 60 * 1000;

  completedDates.forEach((date) => {
    const currentTime = new Date(`${date}T00:00:00`).getTime();
    runningStreak =
      previousTime !== null && currentTime - previousTime === oneDay
        ? runningStreak + 1
        : 1;
    bestStreak = Math.max(bestStreak, runningStreak);
    previousTime = currentTime;
  });

  return bestStreak;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function buildWeeklyDailyProgress(
  rows: {
    daily_goal?: number | null;
    facts_read_count?: number | null;
    goal_completed: boolean;
    progress_date: string;
  }[],
  fallbackDailyGoal: number,
): WeeklyDailyProgressDay[] {
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const today = new Date();
  const todayDateKey = dateKey(today);
  const monday = new Date(today);
  const dayIndex = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - dayIndex);
  const rowsByDate = new Map(rows.map((row) => [row.progress_date, row]));

  return labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = dateKey(date);
    const row = rowsByDate.get(key);
    const readCount = row?.facts_read_count ?? 0;
    const goal = row?.daily_goal ?? fallbackDailyGoal;
    let status: WeeklyDailyProgressDay["status"] = "pending";

    if (row?.goal_completed) {
      status = "completed";
    } else if (key === todayDateKey) {
      status = "current";
    } else if (key < todayDateKey) {
      status = "missed";
    }

    return {
      date: key,
      goal,
      label,
      readCount,
      status,
    };
  });
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
    hook: fact.hook?.trim() || null,
    detail: fact.content,
    difficultyLevel: normalizeDifficultyLevel(fact.difficulty_level),
    longContent: fact.long_content?.trim() || null,
    seoDescription: null,
    seoTitle: null,
    source: cleanFactSource(fact.source),
    sourceUrl: fact.source_url?.trim() || null,
    eventDay: null,
    eventMonth: null,
    eventYear: null,
    publishedAt: null,
    updatedAt: null,
    tone:
      fact.tone ??
      category?.tone ??
      "from-[#0b1424] via-[#132744] to-[#f0a95a]",
    accent: fact.accent_color ?? category?.accent_color ?? "#ffd166",
  };
}

function isStandardProfileFact(fact: FeedFact | null): fact is FeedFact {
  return fact !== null && !isCommercialCollaborationFact(fact);
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
  "fact_id,facts(id,slug,title,hook,content,difficulty_level,long_content,source,source_url,tone,accent_color,categories(name,slug,tone,accent_color,theme_icon,visual_motif))";
const VIEWED_FACT_SELECT =
  "fact_id,facts(category_id,categories(id,name,slug,tone,accent_color,theme_icon,visual_motif))";
const PROFILE_SAVED_FACTS_LIMIT = 3;

function getTopViewedThemes(rows: ViewedFactRow[]): ThemeViewStat[] {
  const themesBySlug = new Map<string, Omit<ThemeViewStat, "percent">>();

  rows.forEach((row) => {
    const fact = row.facts;

    if (!fact) {
      return;
    }

    const category = Array.isArray(fact.categories)
      ? fact.categories[0]
      : fact.categories;

    if (!category?.slug || isCommercialCollaborationSlug(category.slug)) {
      return;
    }

    const current = themesBySlug.get(category.slug);

    themesBySlug.set(category.slug, {
      accent: category.accent_color || "#ffd166",
      count: (current?.count ?? 0) + 1,
      name: category.name,
      slug: category.slug,
      themeIcon: category.theme_icon ?? current?.themeIcon ?? null,
      visualMotif: category.visual_motif ?? current?.visualMotif ?? null,
    });
  });

  const themes = [...themesBySlug.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"))
    .slice(0, 6);
  const maxCount = Math.max(...themes.map((theme) => theme.count), 1);

  return themes.map((theme) => ({
    ...theme,
    percent: Math.round((theme.count / maxCount) * 100),
  }));
}

export async function getUserThemeProgress(): Promise<UserThemeProgress> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return {};
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {};
  }

  const { data, error } = await supabase
    .from("user_fact_views")
    .select(VIEWED_FACT_SELECT)
    .eq("user_id", user.id);

  if (error) {
    logSupabaseError(error, {
      operation: "read all theme progress",
      table: "user_fact_views",
    });
    return {};
  }

  const progress: UserThemeProgress = {};

  ((data ?? []) as ViewedFactRow[]).forEach((row) => {
    const category = Array.isArray(row.facts?.categories)
      ? row.facts?.categories[0]
      : row.facts?.categories;

    if (!category?.slug || isCommercialCollaborationSlug(category.slug)) {
      return;
    }

    progress[category.slug] = (progress[category.slug] ?? 0) + 1;
  });

  return progress;
}

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
    savesCountResult,
    savesResult,
    viewsResult,
    dailyProgressResult,
    gradesResult,
    quizSessionsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,daily_goal,learning_goal,role,created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("saves")
      .select("fact_id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("saves")
      .select(RELATED_FACT_SELECT)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(PROFILE_SAVED_FACTS_LIMIT),
    supabase
      .from("user_fact_views")
      .select(VIEWED_FACT_SELECT)
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
    supabase
      .from("quiz_sessions")
      .select("score,total_questions")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .limit(200),
  ]);

  const blockingError =
    profileResult.error ??
    savesCountResult.error ??
    savesResult.error ??
    viewsResult.error ??
    dailyProgressResult.error;

  if (blockingError) {
    throw new FeedError(getProfileErrorMessage(blockingError));
  }

  const savedFacts = ((savesResult.data ?? []) as RelatedFactRow[])
    .map(mapRelatedFact)
    .filter(isStandardProfileFact);
  const viewRows = (viewsResult.data ?? []) as ViewedFactRow[];
  const standardViewRows = viewRows.filter((row) => {
    const category = Array.isArray(row.facts?.categories)
      ? row.facts?.categories[0]
      : row.facts?.categories;

    return !isCommercialCollaborationSlug(category?.slug);
  });

  const uniqueViews = new Set(
    standardViewRows.map((view) => view.fact_id),
  );
  const topThemes = getTopViewedThemes(standardViewRows);
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
  const dailyGoal = profileResult.data?.daily_goal ?? dailyGoalConfig.defaultGoal;
  const currentDailyStreak = getCurrentDailyGoalStreak(dailyRows);
  const bestDailyStreak = Math.max(
    getBestDailyGoalStreak(dailyRows),
    currentDailyStreak,
  );
  const perfectQuizCount = quizSessionsResult.error
    ? 0
    : (quizSessionsResult.data ?? []).filter(
        (session) =>
          session.total_questions > 0 &&
          session.score === session.total_questions,
      ).length;
  let memoryStats: MemoryStats = {
    averageScorePercent: null,
    bestStreakDays: 0,
    challengesCompleted: 0,
    currentStreakDays: 0,
    lastScore: null,
    lastTotal: null,
    revisableFacts: uniqueViews.size,
  };

  try {
    memoryStats = await getMemoryChallengeStats();
  } catch {
    // Memory stats are secondary; the profile should remain available.
  }

  if (quizSessionsResult.error) {
    logSupabaseError(quizSessionsResult.error, {
      operation: "read perfect quiz count",
      table: "quiz_sessions",
    });
  }

  return {
    username:
      profileResult.data?.username ??
      (typeof user.user_metadata?.username === "string"
        ? user.user_metadata.username
        : null),
    email: user.email ?? null,
    createdAt: profileResult.data?.created_at ?? user.created_at ?? null,
    dailyGoal,
    learningGoal: normalizeLearningGoal(profileResult.data?.learning_goal),
    role: (profileResult.data?.role ?? "membre") as UserRole,
    savedCount: savesCountResult.count ?? savedFacts.length,
    uniqueViewsCount: uniqueViews.size,
    completedDailyGoals: dailyRows.filter((row) => row.goal_completed).length,
    currentStreakDays: currentDailyStreak,
    bestDailyStreakDays: bestDailyStreak,
    perfectQuizCount,
    weeklyDailyProgress: buildWeeklyDailyProgress(dailyRows, dailyGoal),
    grades,
    todayReadCount: todayRow?.facts_read_count ?? 0,
    savedFacts,
    topThemes,
    memoryStats,
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
  learningGoal,
  username,
}: {
  dailyGoal: number;
  learningGoal: LearningGoal;
  username: string;
}): Promise<ProfileMutationResult> {
  const auth = await getAuthenticatedProfileClient();

  if (!auth.ok) {
    return { ok: false, field: "global", message: auth.message };
  }

  const normalizedUsername = normalizeUsername(username);
  const normalizedLearningGoal = normalizeLearningGoal(learningGoal);
  const usernameMessage = getUsernameValidationMessage(normalizedUsername);

  if (usernameMessage) {
    return { ok: false, field: "username", message: usernameMessage };
  }

  if (
    !Number.isInteger(dailyGoal) ||
    dailyGoal < dailyGoalConfig.minGoal ||
    dailyGoal > dailyGoalConfig.maxGoal
  ) {
    return {
      ok: false,
      field: "dailyGoal",
      message: `Choisis un objectif entre ${dailyGoalConfig.minGoal} et ${dailyGoalConfig.maxGoal}.`,
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
      learning_goal: normalizedLearningGoal,
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
      learning_goal: normalizedLearningGoal,
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

function getPasswordAuthErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "Le mot de passe actuel est incorrect.";
  }

  if (normalized.includes("rate limit")) {
    return "Trop de tentatives. Attends un moment avant de réessayer.";
  }

  return "Nous n'avons pas pu vérifier le mot de passe actuel.";
}

export async function updateProfilePassword({
  currentPassword,
  newPassword,
}: {
  currentPassword: string;
  newPassword: string;
}): Promise<ProfileMutationResult> {
  const auth = await getAuthenticatedProfileClient();

  if (!auth.ok) {
    return { ok: false, field: "global", message: auth.message };
  }

  if (!currentPassword) {
    return {
      ok: false,
      field: "currentPassword",
      message: "Entre ton mot de passe actuel.",
    };
  }

  if (!auth.user.email) {
    return {
      ok: false,
      field: "global",
      message: "Nous n'avons pas pu vérifier ton compte pour le moment.",
    };
  }

  if (!isPasswordValid(newPassword)) {
    return {
      ok: false,
      field: "password",
      message: passwordValidationMessage,
    };
  }

  const { error: verifyError } = await auth.supabase.auth.signInWithPassword({
    email: auth.user.email,
    password: currentPassword,
  });

  if (verifyError) {
    logSupabaseError(verifyError, {
      operation: "verify current password before profile password update",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    return {
      ok: false,
      field: "currentPassword",
      message: getPasswordAuthErrorMessage(verifyError.message),
    };
  }

  const { error } = await auth.supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    logSupabaseError(error, {
      operation: "update auth password from profile",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
    return {
      ok: false,
      field: "password",
      message: "Nous n'avons pas pu mettre ton mot de passe à jour.",
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
  const [uniqueViewsResult, todayProgressResult] =
    await Promise.all([
      auth.supabase
        .from("user_fact_views")
        .delete()
        .eq("user_id", auth.user.id),
      auth.supabase
        .from("user_daily_progress")
        .delete()
        .eq("user_id", auth.user.id)
        .eq("progress_date", today),
    ]);

  const error =
    uniqueViewsResult.error ??
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
