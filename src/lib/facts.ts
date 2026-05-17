import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/slug";

export const DEFAULT_DAILY_GOAL = 10;

export type FeedFact = {
  id: string;
  slug: string;
  category: string;
  categorySlug: string;
  title: string;
  hook: string;
  detail: string;
  source: string;
  sourceUrl: string | null;
  tone: string;
  accent: string;
};

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  tone: string;
  accent: string;
  count?: number;
};

export type DailyProgressResult = {
  ok: boolean;
  viewedTodayCount: number;
  dailyGoal: number;
  goalCompleted: boolean;
  completedToday: boolean;
  uniqueViewCreated: boolean;
  reason?: "auth_required" | "unavailable";
};

type DailyProgressRow = {
  progress_date: string;
  viewed_fact_ids: string[];
  facts_read_count: number;
  daily_goal: number;
  goal_completed: boolean;
  completed_at: string | null;
};

export class FeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedError";
  }
}

type FactCategory = {
  id: string;
  name: string;
  slug: string;
  tone: string;
  accent_color: string;
};

type FactRow = {
  id: string;
  slug?: string | null;
  title: string;
  hook: string;
  content: string;
  source: string;
  source_url?: string | null;
  tone: string | null;
  accent_color: string | null;
  categories: FactCategory | FactCategory[] | null;
};

type RawDailyProgressRow = {
  facts_read_count: number;
  daily_goal: number;
  goal_completed: boolean;
  completed_today?: boolean;
  unique_view_created?: boolean;
};

const FACT_SELECT =
  "id,slug,title,hook,content,source,source_url,tone,accent_color,categories(id,name,slug,tone,accent_color)";

const FACT_SELECT_WITH_INNER_CATEGORY =
  "id,slug,title,hook,content,source,source_url,tone,accent_color,categories!inner(id,name,slug,tone,accent_color)";

function categoryFromRelation(fact: FactRow) {
  return Array.isArray(fact.categories)
    ? fact.categories[0]
    : fact.categories;
}

function mapFact(fact: FactRow): FeedFact {
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

function mapCategory(category: FactCategory): CategorySummary {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    tone: category.tone,
    accent: category.accent_color,
  };
}

function getSupabaseDataErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);
    const normalizedMessage = message.toLowerCase();

    if (normalizedMessage.includes("failed to fetch")) {
      return "Connexion a Supabase impossible. Verifie la connexion ou les variables d'environnement.";
    }

    if (
      normalizedMessage.includes("permission denied") ||
      normalizedMessage.includes("row-level security") ||
      normalizedMessage.includes("403")
    ) {
      return "Lecture refusee par Supabase. Verifie les policies RLS associees.";
    }

    if (
      normalizedMessage.includes("relationship") ||
      normalizedMessage.includes("foreign key")
    ) {
      return "Relation facts/categories introuvable. Verifie le schema SQL Supabase.";
    }

    if (normalizedMessage.includes("slug")) {
      return "La colonne slug manque encore dans Supabase. Applique la migration fournie.";
    }

    return message;
  }

  return "Les donnees sont indisponibles pour le moment.";
}

function uniqueFactsById(facts: FeedFact[]) {
  const seen = new Set<string>();

  return facts.filter((fact) => {
    if (seen.has(fact.id)) {
      return false;
    }

    seen.add(fact.id);
    return true;
  });
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getBoundedDailyGoal(dailyGoal: number) {
  return Math.max(1, Math.min(dailyGoal, 100));
}

function emptyDailyProgress(
  dailyGoal = DEFAULT_DAILY_GOAL,
): DailyProgressResult {
  return {
    ok: true,
    viewedTodayCount: 0,
    dailyGoal: getBoundedDailyGoal(dailyGoal),
    goalCompleted: false,
    completedToday: false,
    uniqueViewCreated: false,
  };
}

export async function getCurrentUserId() {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { supabase: null, userId: null };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return { supabase, userId: null };
  }

  return { supabase, userId: user?.id ?? null };
}

export async function getFeedFacts(options?: { themeSlug?: string }) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return {
      facts: [] as FeedFact[],
      source: "unavailable" as const,
      theme: null,
    };
  }

  let theme: CategorySummary | null = null;

  if (options?.themeSlug) {
    const { data: categoryData, error: categoryError } = await supabase
      .from("categories")
      .select("id,name,slug,tone,accent_color")
      .eq("slug", options.themeSlug)
      .maybeSingle();

    if (categoryError) {
      throw new FeedError(getSupabaseDataErrorMessage(categoryError));
    }

    if (!categoryData) {
      return { facts: [] as FeedFact[], source: "supabase" as const, theme };
    }

    theme = mapCategory(categoryData);
  }

  let query = supabase
    .from("facts")
    .select(theme ? FACT_SELECT_WITH_INNER_CATEGORY : FACT_SELECT)
    .eq("status", "published");

  if (theme) {
    query = query.eq("category_id", theme.id);
  }

  const { data, error } = await query
    .order("display_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (error) {
    throw new FeedError(getSupabaseDataErrorMessage(error));
  }

  return {
    facts: uniqueFactsById(((data ?? []) as FactRow[]).map(mapFact)),
    source: "supabase" as const,
    theme,
  };
}

export async function getExplorerData() {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return {
      categories: [] as CategorySummary[],
      facts: [] as FeedFact[],
      source: "unavailable" as const,
    };
  }

  const [categoriesResult, factsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,slug,tone,accent_color")
      .order("name", { ascending: true }),
    supabase
      .from("facts")
      .select(FACT_SELECT)
      .eq("status", "published")
      .order("published_at", { ascending: false }),
  ]);

  if (categoriesResult.error) {
    throw new FeedError(getSupabaseDataErrorMessage(categoriesResult.error));
  }

  if (factsResult.error) {
    throw new FeedError(getSupabaseDataErrorMessage(factsResult.error));
  }

  const facts = uniqueFactsById(((factsResult.data ?? []) as FactRow[]).map(mapFact));
  const counts = new Map<string, number>();

  for (const fact of facts) {
    counts.set(fact.categorySlug, (counts.get(fact.categorySlug) ?? 0) + 1);
  }

  return {
    categories: ((categoriesResult.data ?? []) as FactCategory[]).map(
      (category) => ({
        ...mapCategory(category),
        count: counts.get(category.slug) ?? 0,
      }),
    ),
    facts,
    source: "supabase" as const,
  };
}

export async function getFactBySlug(slug: string) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("facts")
    .select(FACT_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new FeedError(getSupabaseDataErrorMessage(error));
  }

  return data ? mapFact(data as FactRow) : null;
}

export async function getTodayDailyProgress(dailyGoal = DEFAULT_DAILY_GOAL) {
  const { supabase, userId } = await getCurrentUserId();
  const boundedGoal = getBoundedDailyGoal(dailyGoal);

  if (!supabase || !userId) {
    return { ...emptyDailyProgress(boundedGoal), ok: false, reason: "auth_required" as const };
  }

  const { data, error } = await supabase
    .from("user_daily_progress")
    .select("progress_date,viewed_fact_ids,facts_read_count,daily_goal,goal_completed,completed_at")
    .eq("user_id", userId)
    .eq("progress_date", todayKey())
    .maybeSingle();

  if (error) {
    throw new FeedError(getSupabaseDataErrorMessage(error));
  }

  if (!data) {
    return emptyDailyProgress(boundedGoal);
  }

  return {
    ok: true,
    viewedTodayCount: data.facts_read_count,
    dailyGoal: data.daily_goal,
    goalCompleted: data.goal_completed,
    completedToday: false,
    uniqueViewCreated: false,
  };
}

export async function getUserFactActions(factIds: string[]) {
  const { supabase, userId } = await getCurrentUserId();
  const uniqueFactIds = [...new Set(factIds)].filter(Boolean);

  if (!supabase || !userId || uniqueFactIds.length === 0) {
    return { liked: [] as string[], saved: [] as string[] };
  }

  const [likesResult, savesResult] = await Promise.all([
    supabase
      .from("likes")
      .select("fact_id")
      .eq("user_id", userId)
      .in("fact_id", uniqueFactIds),
    supabase
      .from("saves")
      .select("fact_id")
      .eq("user_id", userId)
      .in("fact_id", uniqueFactIds),
  ]);

  if (likesResult.error || savesResult.error) {
    throw new FeedError(
      getSupabaseDataErrorMessage(likesResult.error ?? savesResult.error),
    );
  }

  return {
    liked: (likesResult.data ?? []).map((item) => item.fact_id),
    saved: (savesResult.data ?? []).map((item) => item.fact_id),
  };
}

export async function likeFact(factId: string) {
  const { supabase, userId } = await getCurrentUserId();

  if (!supabase || !userId) {
    return { ok: false, reason: "auth_required" as const };
  }

  const { error } = await supabase
    .from("likes")
    .upsert(
      { fact_id: factId, user_id: userId },
      { onConflict: "user_id,fact_id" },
    );

  if (error) {
    throw new FeedError(getSupabaseDataErrorMessage(error));
  }

  return { ok: true };
}

export async function unlikeFact(factId: string) {
  const { supabase, userId } = await getCurrentUserId();

  if (!supabase || !userId) {
    return { ok: false, reason: "auth_required" as const };
  }

  const { error } = await supabase
    .from("likes")
    .delete()
    .eq("fact_id", factId)
    .eq("user_id", userId);

  if (error) {
    throw new FeedError(getSupabaseDataErrorMessage(error));
  }

  return { ok: true };
}

export async function saveFact(factId: string) {
  const { supabase, userId } = await getCurrentUserId();

  if (!supabase || !userId) {
    return { ok: false, reason: "auth_required" as const };
  }

  const { error } = await supabase
    .from("saves")
    .upsert(
      { fact_id: factId, user_id: userId },
      { onConflict: "user_id,fact_id" },
    );

  if (error) {
    throw new FeedError(getSupabaseDataErrorMessage(error));
  }

  return { ok: true };
}

export async function unsaveFact(factId: string) {
  const { supabase, userId } = await getCurrentUserId();

  if (!supabase || !userId) {
    return { ok: false, reason: "auth_required" as const };
  }

  const { error } = await supabase
    .from("saves")
    .delete()
    .eq("fact_id", factId)
    .eq("user_id", userId);

  if (error) {
    throw new FeedError(getSupabaseDataErrorMessage(error));
  }

  return { ok: true };
}

export async function recordFactView(
  factId: string,
  dailyGoal = DEFAULT_DAILY_GOAL,
) {
  const supabase = createSupabaseBrowserClient();
  const boundedGoal = getBoundedDailyGoal(dailyGoal);
  const progressDate = todayKey();

  if (!supabase) {
    return { ...emptyDailyProgress(boundedGoal), ok: false, reason: "unavailable" as const };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ...emptyDailyProgress(boundedGoal), ok: false, reason: "auth_required" as const };
  }

  const { data, error } = await supabase.rpc("record_fact_read", {
    p_fact_id: factId,
    p_progress_date: progressDate,
    p_daily_goal: boundedGoal,
  });

  if (!error) {
    const row = (Array.isArray(data) ? data[0] : data) as
      | RawDailyProgressRow
      | null;

    if (row) {
      return {
        ok: true,
        viewedTodayCount: row.facts_read_count,
        dailyGoal: row.daily_goal,
        goalCompleted: row.goal_completed,
        completedToday: Boolean(row.completed_today),
        uniqueViewCreated: Boolean(row.unique_view_created),
      };
    }
  }

  const directResult = await recordFactViewDirectly(
    user.id,
    factId,
    progressDate,
    boundedGoal,
  );

  return directResult;
}

async function recordFactViewDirectly(
  userId: string,
  factId: string,
  progressDate: string,
  dailyGoal: number,
): Promise<DailyProgressResult> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ...emptyDailyProgress(dailyGoal), ok: false, reason: "unavailable" };
  }

  const uniqueViewResult = await supabase
    .from("user_fact_views")
    .upsert(
      { user_id: userId, fact_id: factId },
      {
        onConflict: "user_id,fact_id",
        ignoreDuplicates: true,
      },
    );

  if (uniqueViewResult.error) {
    throw new FeedError(getSupabaseDataErrorMessage(uniqueViewResult.error));
  }

  const { data: currentProgress, error: progressError } = await supabase
    .from("user_daily_progress")
    .select("progress_date,viewed_fact_ids,facts_read_count,daily_goal,goal_completed,completed_at")
    .eq("user_id", userId)
    .eq("progress_date", progressDate)
    .maybeSingle();

  if (progressError) {
    throw new FeedError(getSupabaseDataErrorMessage(progressError));
  }

  if (!currentProgress) {
    const goalCompleted = 1 >= dailyGoal;
    const { data: insertedProgress, error: insertError } = await supabase
      .from("user_daily_progress")
      .insert({
        user_id: userId,
        progress_date: progressDate,
        viewed_fact_ids: [factId],
        facts_read_count: 1,
        daily_goal: dailyGoal,
        goal_completed: goalCompleted,
        completed_at: goalCompleted ? new Date().toISOString() : null,
      })
      .select("progress_date,viewed_fact_ids,facts_read_count,daily_goal,goal_completed,completed_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return recordFactViewDirectly(userId, factId, progressDate, dailyGoal);
      }

      throw new FeedError(getSupabaseDataErrorMessage(insertError));
    }

    return {
      ok: true,
      viewedTodayCount: insertedProgress.facts_read_count,
      dailyGoal: insertedProgress.daily_goal,
      goalCompleted: insertedProgress.goal_completed,
      completedToday: insertedProgress.goal_completed,
      uniqueViewCreated: true,
    };
  }

  const row = currentProgress as DailyProgressRow;
  const existingFactIds = row.viewed_fact_ids ?? [];
  const wasReadToday = existingFactIds.includes(factId);

  if (wasReadToday) {
    return {
      ok: true,
      viewedTodayCount: row.facts_read_count,
      dailyGoal: row.daily_goal,
      goalCompleted: row.goal_completed,
      completedToday: false,
      uniqueViewCreated: false,
    };
  }

  const nextFactIds = [...existingFactIds, factId];
  const nextCount = nextFactIds.length;
  const wasCompleted = row.goal_completed;
  const nextGoalCompleted = wasCompleted || nextCount >= dailyGoal;
  const completedToday = !wasCompleted && nextGoalCompleted;

  const { data: updatedProgress, error: updateError } = await supabase
    .from("user_daily_progress")
    .update({
      viewed_fact_ids: nextFactIds,
      facts_read_count: nextCount,
      daily_goal: dailyGoal,
      goal_completed: nextGoalCompleted,
      completed_at: completedToday
        ? new Date().toISOString()
        : row.completed_at,
    })
    .eq("user_id", userId)
    .eq("progress_date", progressDate)
    .select("progress_date,viewed_fact_ids,facts_read_count,daily_goal,goal_completed,completed_at")
    .single();

  if (updateError) {
    throw new FeedError(getSupabaseDataErrorMessage(updateError));
  }

  return {
    ok: true,
    viewedTodayCount: updatedProgress.facts_read_count,
    dailyGoal: updatedProgress.daily_goal,
    goalCompleted: updatedProgress.goal_completed,
    completedToday,
    uniqueViewCreated: true,
  };
}
