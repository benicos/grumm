import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatAppError, logAppError } from "@/lib/errors";
import { slugify } from "@/lib/slug";

export const DEFAULT_DAILY_GOAL = 10;
export const DISCOVER_FEED_BATCH_SIZE = 18;

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
  completedDailyGoals: number;
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

type FeedRpcRow = {
  id: string;
  slug: string;
  title: string;
  hook: string;
  content: string;
  source: string;
  source_url: string | null;
  tone: string | null;
  accent_color: string | null;
  category_id: string;
  category_name: string;
  category_slug: string;
  category_tone: string;
  category_accent_color: string;
};

type ExplorerThemeRpcRow = FactCategory & {
  published_facts_count: number;
};

type SearchFactRpcRow = FeedRpcRow & {
  rank?: number;
};

export type ExplorerData = {
  categories: CategorySummary[];
  facts: FeedFact[];
  recentFacts: FeedFact[];
  source: "supabase" | "unavailable";
};

type RawDailyProgressRow = {
  facts_read_count: number;
  daily_goal: number;
  goal_completed: boolean;
  completed_today?: boolean;
  completed_goals_count?: number;
  unique_view_created?: boolean;
};

const FACT_SELECT =
  "id,slug,title,hook,content,source,source_url,tone,accent_color,categories(id,name,slug,tone,accent_color)";

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

function mapFeedRpcFact(fact: FeedRpcRow): FeedFact {
  return {
    id: fact.id,
    slug: fact.slug || slugify(fact.title),
    category: fact.category_name ?? "General",
    categorySlug: fact.category_slug ?? "general",
    title: fact.title,
    hook: fact.hook,
    detail: fact.content,
    source: fact.source || "Source non renseignee",
    sourceUrl: fact.source_url ?? null,
    tone:
      fact.tone ??
      fact.category_tone ??
      "from-[#0b1424] via-[#132744] to-[#f0a95a]",
    accent: fact.accent_color ?? fact.category_accent_color ?? "#ffd166",
  };
}

function mapExplorerTheme(category: ExplorerThemeRpcRow): CategorySummary {
  return {
    ...mapCategory(category),
    count: category.published_facts_count,
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

function getSupabaseDataErrorMessage(
  error: unknown,
  context?: {
    operation?: string;
    table?: string;
  },
) {
  const prodMessage =
    context?.operation?.includes("action") ||
    context?.operation?.includes("like") ||
    context?.operation?.includes("save")
      ? "Cette action n'a pas pu être effectuée."
      : "Impossible de charger ce contenu pour le moment.";

  return formatAppError(error, {
    context: {
      operation: context?.operation,
      source: "Supabase",
      table: context?.table,
    },
    prodMessage,
  });
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
    completedDailyGoals: 0,
    uniqueViewCreated: false,
  };
}

async function getCompletedDailyGoalsCount(
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
  userId: string,
) {
  const { count, error } = await supabase
    .from("user_daily_progress")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("goal_completed", true);

  if (error) {
    throw new FeedError(
      getSupabaseDataErrorMessage(error, {
        operation: "count completed daily goals",
        table: "user_daily_progress",
      }),
    );
  }

  return count ?? 0;
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

export async function getFeedFacts(options?: {
  excludeIds?: string[];
  limit?: number;
  themeSlug?: string;
}) {
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
      throw new FeedError(
        getSupabaseDataErrorMessage(categoryError, {
          operation: "read theme",
          table: "categories",
        }),
      );
    }

    if (!categoryData) {
      return { facts: [] as FeedFact[], source: "supabase" as const, theme };
    }

    theme = mapCategory(categoryData);
  }

  const { data, error } = await supabase.rpc("get_discover_feed", {
    p_exclude_ids: options?.excludeIds ?? [],
    p_limit: options?.limit ?? DISCOVER_FEED_BATCH_SIZE,
    p_theme_slug: options?.themeSlug ?? null,
  });

  if (error) {
    throw new FeedError(
      getSupabaseDataErrorMessage(error, {
        operation: "read discover facts",
        table: "facts",
      }),
    );
  }

  return {
    facts: uniqueFactsById(((data ?? []) as FeedRpcRow[]).map(mapFeedRpcFact)),
    source: "supabase" as const,
    theme,
  };
}

function normalizeSearchTerm(query?: string) {
  return query?.trim().replace(/[%,_]/g, " ").replace(/\s+/g, " ") ?? "";
}

async function getExplorerThemesWithCounts(
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
  searchTerm: string,
) {
  const rpcResult = await supabase.rpc("get_explorer_themes", {
    p_limit: searchTerm ? 60 : 18,
    p_query: searchTerm || null,
  });

  if (!rpcResult.error) {
    return ((rpcResult.data ?? []) as ExplorerThemeRpcRow[]).map(
      mapExplorerTheme,
    );
  }

  const categoriesQuery = supabase
    .from("categories")
    .select("id,name,slug,tone,accent_color")
    .order("name", { ascending: true });

  const categoriesResult = searchTerm
    ? await categoriesQuery.or(
        `name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`,
      )
    : await categoriesQuery.limit(18);

  if (categoriesResult.error) {
    throw new FeedError(
      getSupabaseDataErrorMessage(categoriesResult.error, {
        operation: "read explorer themes",
        table: "categories",
      }),
    );
  }

  const categories = (categoriesResult.data ?? []) as FactCategory[];
  const counts = await Promise.all(
    categories.map(async (category) => {
      const { count, error } = await supabase
        .from("facts")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .eq("category_id", category.id);

      if (error) {
        throw new FeedError(
          getSupabaseDataErrorMessage(error, {
            operation: "count explorer theme facts",
            table: "facts",
          }),
        );
      }

      return [category.id, count ?? 0] as const;
    }),
  );
  const countByCategoryId = new Map(counts);

  return categories.map((category) => ({
    ...mapCategory(category),
    count: countByCategoryId.get(category.id) ?? 0,
  }));
}

async function searchExplorerFacts(
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
  searchTerm: string,
) {
  const rpcResult = await supabase.rpc("search_published_facts", {
    p_limit: 36,
    p_query: searchTerm,
  });

  if (!rpcResult.error) {
    return uniqueFactsById(
      ((rpcResult.data ?? []) as SearchFactRpcRow[]).map(mapFeedRpcFact),
    );
  }

  const matchingCategoriesResult = await supabase
    .from("categories")
    .select("id,name,slug,tone,accent_color")
    .or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);

  if (matchingCategoriesResult.error) {
    throw new FeedError(
      getSupabaseDataErrorMessage(matchingCategoriesResult.error, {
        operation: "search explorer themes",
        table: "categories",
      }),
    );
  }

  const matchingCategoryIds = ((matchingCategoriesResult.data ?? []) as FactCategory[])
    .map((category) => category.id);
  const directFactsQuery = supabase
    .from("facts")
    .select(FACT_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(36);
  const factsResult = await directFactsQuery.or(
    `title.ilike.%${searchTerm}%,hook.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,source.ilike.%${searchTerm}%,source_url.ilike.%${searchTerm}%`,
  );
  const categoryFactsResult =
    matchingCategoryIds.length > 0
      ? await supabase
          .from("facts")
          .select(FACT_SELECT)
          .eq("status", "published")
          .in("category_id", matchingCategoryIds)
          .order("published_at", { ascending: false })
          .limit(36)
      : null;

  if (factsResult.error) {
    throw new FeedError(
      getSupabaseDataErrorMessage(factsResult.error, {
        operation: "search explorer facts",
        table: "facts",
      }),
    );
  }

  if (categoryFactsResult?.error) {
    throw new FeedError(
      getSupabaseDataErrorMessage(categoryFactsResult.error, {
        operation: "search explorer facts by theme",
        table: "facts",
      }),
    );
  }

  return uniqueFactsById(
    [
      ...(((factsResult.data ?? []) as FactRow[]).map(mapFact)),
      ...(((categoryFactsResult?.data ?? []) as FactRow[]).map(mapFact)),
    ],
  );
}

async function getRecentPublishedFacts(
  supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>,
) {
  const { data, error } = await supabase
    .from("facts")
    .select(FACT_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    throw new FeedError(
      getSupabaseDataErrorMessage(error, {
        operation: "read recent explorer facts",
        table: "facts",
      }),
    );
  }

  return ((data ?? []) as FactRow[]).map(mapFact);
}

export async function getExplorerData(options?: { query?: string }): Promise<ExplorerData> {
  const supabase = createSupabaseBrowserClient();
  const searchTerm = normalizeSearchTerm(options?.query);

  if (!supabase) {
    return {
      categories: [] as CategorySummary[],
      facts: [] as FeedFact[],
      recentFacts: [] as FeedFact[],
      source: "unavailable" as const,
    };
  }

  const [categories, facts, recentFacts] = await Promise.all([
    getExplorerThemesWithCounts(supabase, searchTerm),
    searchTerm
      ? searchExplorerFacts(supabase, searchTerm)
      : getFeedFacts({ limit: 10 }).then((result) => result.facts),
    searchTerm ? Promise.resolve([] as FeedFact[]) : getRecentPublishedFacts(supabase),
  ]);

  return {
    categories,
    facts,
    recentFacts,
    source: "supabase" as const,
  };
}

export async function getFactOfTheDay() {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return {
      fact: null as FeedFact | null,
      interactionCount: 0,
      source: "unavailable" as const,
    };
  }

  const { data, error } = await supabase.rpc("get_fact_of_the_day", {});

  if (!error) {
    const row = Array.isArray(data) ? data[0] : null;

    if (row) {
      return {
        fact: mapFeedRpcFact(row as FeedRpcRow),
        interactionCount:
          typeof row.interaction_count === "number" ? row.interaction_count : 0,
        source: "supabase" as const,
      };
    }
  }

  const fallback = await getFeedFacts({ limit: 1 });

  return {
    fact: fallback.facts[0] ?? null,
    interactionCount: 0,
    source: fallback.source,
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
    throw new FeedError(
      getSupabaseDataErrorMessage(error, {
        operation: "read fact by slug",
        table: "facts",
      }),
    );
  }

  return data ? mapFact(data as FactRow) : null;
}

export async function getTodayDailyProgress(dailyGoal = DEFAULT_DAILY_GOAL) {
  const { supabase, userId } = await getCurrentUserId();
  const boundedGoal = getBoundedDailyGoal(dailyGoal);

  if (!supabase || !userId) {
    return { ...emptyDailyProgress(boundedGoal), ok: false, reason: "auth_required" as const };
  }

  const [progressResult, completedGoals] = await Promise.all([
    supabase
      .from("user_daily_progress")
      .select("progress_date,viewed_fact_ids,facts_read_count,daily_goal,goal_completed,completed_at")
      .eq("user_id", userId)
      .eq("progress_date", todayKey())
      .maybeSingle(),
    getCompletedDailyGoalsCount(supabase, userId),
  ]);

  const { data, error } = progressResult;

  if (error) {
    throw new FeedError(
      getSupabaseDataErrorMessage(error, {
        operation: "read daily progress",
        table: "user_daily_progress",
      }),
    );
  }

  if (!data) {
    return {
      ...emptyDailyProgress(boundedGoal),
      completedDailyGoals: completedGoals,
    };
  }

  return {
    ok: true,
    viewedTodayCount: data.facts_read_count,
    dailyGoal: boundedGoal,
    goalCompleted: data.goal_completed || data.facts_read_count >= boundedGoal,
    completedToday: false,
    completedDailyGoals: completedGoals,
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
      getSupabaseDataErrorMessage(likesResult.error ?? savesResult.error, {
        operation: "read user fact actions",
        table: likesResult.error ? "likes" : "saves",
      }),
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
    throw new FeedError(
      getSupabaseDataErrorMessage(error, {
        operation: "like action",
        table: "likes",
      }),
    );
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
    throw new FeedError(
      getSupabaseDataErrorMessage(error, {
        operation: "unlike action",
        table: "likes",
      }),
    );
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
    throw new FeedError(
      getSupabaseDataErrorMessage(error, {
        operation: "save action",
        table: "saves",
      }),
    );
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
    throw new FeedError(
      getSupabaseDataErrorMessage(error, {
        operation: "unsave action",
        table: "saves",
      }),
    );
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
      const completedDailyGoals =
        row.completed_goals_count ??
        (await getCompletedDailyGoalsCount(supabase, user.id));

      return {
        ok: true,
        viewedTodayCount: row.facts_read_count,
        dailyGoal: row.daily_goal,
        goalCompleted: row.goal_completed,
        completedToday: Boolean(row.completed_today),
        completedDailyGoals,
        uniqueViewCreated: Boolean(row.unique_view_created),
      };
    }
  }

  if (error) {
    logAppError(error, {
      operation: "record fact read rpc fallback",
      source: "Supabase",
      table: "record_fact_read",
    });
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
    throw new FeedError(
      getSupabaseDataErrorMessage(uniqueViewResult.error, {
        operation: "record unique fact view",
        table: "user_fact_views",
      }),
    );
  }

  const { data: currentProgress, error: progressError } = await supabase
    .from("user_daily_progress")
    .select("progress_date,viewed_fact_ids,facts_read_count,daily_goal,goal_completed,completed_at")
    .eq("user_id", userId)
    .eq("progress_date", progressDate)
    .maybeSingle();

  if (progressError) {
    throw new FeedError(
      getSupabaseDataErrorMessage(progressError, {
        operation: "read daily progress before update",
        table: "user_daily_progress",
      }),
    );
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

      throw new FeedError(
        getSupabaseDataErrorMessage(insertError, {
          operation: "create daily progress",
          table: "user_daily_progress",
        }),
      );
    }

    const completedDailyGoals = await getCompletedDailyGoalsCount(
      supabase,
      userId,
    );

    return {
      ok: true,
      viewedTodayCount: insertedProgress.facts_read_count,
      dailyGoal: insertedProgress.daily_goal,
      goalCompleted: insertedProgress.goal_completed,
      completedToday: insertedProgress.goal_completed,
      completedDailyGoals,
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
      completedDailyGoals: await getCompletedDailyGoalsCount(supabase, userId),
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
    throw new FeedError(
      getSupabaseDataErrorMessage(updateError, {
        operation: "update daily progress",
        table: "user_daily_progress",
      }),
    );
  }

  const completedDailyGoals = await getCompletedDailyGoalsCount(supabase, userId);

  return {
    ok: true,
    viewedTodayCount: updatedProgress.facts_read_count,
    dailyGoal: updatedProgress.daily_goal,
    goalCompleted: updatedProgress.goal_completed,
    completedToday,
    completedDailyGoals,
    uniqueViewCreated: true,
  };
}
