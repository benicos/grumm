import { Share } from "react-native";

import { mobileConfig, userMessages } from "../config/app";
import type {
  CategorySummary,
  DailyProgressResult,
  ExplorerData,
  FactActions,
  FeedFact,
  ProfileSummary,
  QuizStatsSummary,
  RelatedFactRow,
  ThemeViewStat,
} from "../types/domain";
import { getBadgeInfo, getGoalCelebrationMessage, type GradeDefinition } from "./badges";
import {
  filterCommercialCollaborationCategories,
  filterCommercialCollaborationFacts,
  isCommercialCollaborationFact,
  isCommercialCollaborationSlug,
} from "./commercial";
import { slugify } from "./slug";
import { normalizeLearningGoal, type LearningGoal } from "./learning";
import { cleanFactSource } from "./source";
import { getSupabaseClient, withSupabaseTimeout } from "./supabase";

type FeedRpcRow = {
  accent_color: string | null;
  category_accent_color: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  category_tone: string;
  content: string;
  long_content?: string | null;
  hook: string | null;
  id: string;
  slug: string;
  source: string | null;
  source_url: string | null;
  title: string;
  tone: string | null;
};

type RelatedCategory = {
  accent_color: string;
  id?: string;
  name: string;
  slug: string;
  tone: string;
};

type ViewedFactRow = {
  fact_id: string;
  facts:
    | {
        categories:
          | {
              accent_color: string;
              theme_icon?: string | null;
              theme_image_url?: string | null;
              name: string;
              slug: string;
              tone: string;
            }
          | {
              accent_color: string;
              theme_icon?: string | null;
              theme_image_url?: string | null;
              name: string;
              slug: string;
              tone: string;
            }[]
          | null;
      }
    | null;
};

type CategoryRow = {
  accent_color: string;
  id: string;
  name: string;
  slug: string;
  theme_icon: string | null;
  theme_image_url: string | null;
  tone: string;
};

type DailyProgressRow = {
  facts_read_count: number;
  goal_completed: boolean;
  progress_date: string;
};

type RawDailyProgressRow = {
  completed_goals_count?: number;
  completed_today?: boolean;
  daily_goal: number;
  facts_read_count: number;
  goal_completed: boolean;
  unique_view_created?: boolean;
};

type GradeRow = {
  badge: string | null;
  description: string | null;
  display_order: number;
  id: string;
  name: string;
  required_goals: number;
  slug: string;
};

type ExplorerThemeRpcRow = CategoryRow & {
  published_facts_count: number;
};

const relatedFactSelect =
  "fact_id,facts(id,slug,title,hook,content,long_content,source,source_url,tone,accent_color,categories(name,slug,tone,accent_color))";
const CACHE_TTL_MS = 45_000;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const feedCache = new Map<string, CacheEntry<FeedFact[]>>();
const explorerCache = new Map<string, CacheEntry<ExplorerData>>();
const profileSummaryCache = new Map<string, CacheEntry<ProfileSummary>>();
const savedFactsCache = new Map<string, CacheEntry<FeedFact[]>>();
const pendingFeedRequests = new Map<string, Promise<FeedFact[]>>();
const pendingFactActionsRequests = new Map<string, Promise<Map<string, FactActions>>>();
let feedSessionId: string | null = null;

function createFeedSessionId() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (value) =>
    (
      Number(value) ^
      (Math.random() * 16) >> (Number(value) / 4)
    ).toString(16),
  );
}

function getFeedSessionId() {
  if (!feedSessionId) {
    feedSessionId = createFeedSessionId();
  }

  return feedSessionId;
}

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string) {
  const entry = cache.get(key);

  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

function setCached<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
  cache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  });
}

function cleanOptionalText(value?: string | null) {
  const text = value?.trim();

  return text ? text : null;
}

function getCategory(fact: NonNullable<RelatedFactRow["facts"]>): RelatedCategory | null {
  const category = Array.isArray(fact.categories)
    ? fact.categories[0]
    : fact.categories;

  return (category ?? null) as RelatedCategory | null;
}

function mapFeedFact(row: FeedRpcRow): FeedFact {
  return {
    accent: row.accent_color ?? row.category_accent_color ?? "#ffd166",
    category: row.category_name ?? "Général",
    categorySlug: row.category_slug ?? "general",
    detail: row.content,
    longContent: row.long_content?.trim() || null,
    hook: row.hook?.trim() || null,
    id: row.id,
    slug: row.slug || slugify(row.title),
    source: cleanFactSource(row.source),
    sourceUrl: cleanOptionalText(row.source_url),
    title: row.title,
    tone: row.tone ?? row.category_tone ?? "premium",
  };
}

function mapRelatedFact(row: RelatedFactRow): FeedFact | null {
  const fact = row.facts;

  if (!fact) {
    return null;
  }

  const category = getCategory(fact);

  return {
    accent: fact.accent_color ?? category?.accent_color ?? "#ffd166",
    category: category?.name ?? "Général",
    categorySlug: category?.slug ?? "general",
    detail: fact.content,
    longContent: fact.long_content?.trim() || null,
    hook: fact.hook?.trim() || null,
    id: fact.id,
    slug: fact.slug || slugify(fact.title),
    source: cleanFactSource(fact.source),
    sourceUrl: cleanOptionalText(fact.source_url),
    title: fact.title,
    tone: fact.tone ?? category?.tone ?? "premium",
  };
}

function isStandardFact(fact: FeedFact | null): fact is FeedFact {
  return fact !== null && !isCommercialCollaborationFact(fact);
}

function mapCategory(category: CategoryRow): CategorySummary {
  return {
    accent: category.accent_color,
    id: category.id,
    imageUrl: cleanOptionalText(category.theme_image_url),
    name: category.name,
    slug: category.slug,
    themeIcon: cleanOptionalText(category.theme_icon),
    tone: category.tone,
  };
}

function getTopViewedThemes(rows: ViewedFactRow[]): ThemeViewStat[] {
  const themesBySlug = new Map<string, Omit<ThemeViewStat, "percent">>();

  rows.forEach((row) => {
    const category = Array.isArray(row.facts?.categories)
      ? row.facts?.categories[0]
      : row.facts?.categories;

    if (!category?.slug || isCommercialCollaborationSlug(category.slug)) {
      return;
    }

    const current = themesBySlug.get(category.slug);
    themesBySlug.set(category.slug, {
      accent: category.accent_color || "#ffd166",
      count: (current?.count ?? 0) + 1,
      imageUrl: cleanOptionalText(category.theme_image_url),
      name: category.name,
      slug: category.slug,
      themeIcon: cleanOptionalText(category.theme_icon),
    });
  });

  const themes = [...themesBySlug.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"))
    .slice(0, 4);
  const maxCount = Math.max(...themes.map((theme) => theme.count), 1);

  return themes.map((theme) => ({
    ...theme,
    percent: Math.round((theme.count / maxCount) * 100),
  }));
}

function mapExplorerTheme(category: ExplorerThemeRpcRow): CategorySummary {
  return {
    ...mapCategory(category),
    count: category.published_facts_count,
  };
}

function mapGrade(grade: GradeRow): GradeDefinition {
  return {
    badge: grade.badge,
    displayOrder: grade.display_order,
    id: grade.id,
    name: grade.name,
    requiredGoals: grade.required_goals,
    slug: grade.slug,
  };
}

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${now.getFullYear()}-${month}-${day}`;
}

function keyFromDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

function getCompletedStreak(rows: DailyProgressRow[]) {
  const completedDates = new Set(rows.filter((row) => row.goal_completed).map((row) => row.progress_date));
  const cursor = new Date();
  let streak = 0;

  while (completedDates.has(keyFromDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getCurrentWeekGoalDays(rows: DailyProgressRow[]) {
  const rowsByDate = new Map(rows.map((row) => [row.progress_date, row]));
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  return Array.from({ length: 7 }, (_, dayIndex) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + dayIndex);
    const dateKey = keyFromDate(date);
    const row = rowsByDate.get(dateKey);

    return {
      completed: Boolean(row?.goal_completed),
      count: row?.facts_read_count ?? 0,
      date: dateKey,
      dayIndex,
    };
  });
}

export function getFactUrl(fact: FeedFact) {
  return `${mobileConfig.siteUrl.replace(/\/$/, "")}/fact/${fact.slug}`;
}

export async function getFeedFacts(options?: {
  excludeIds?: string[];
  learningGoal?: LearningGoal | null;
  limit?: number;
  themeSlug?: string | null;
  userId?: string | null;
}) {
  const excludeIds = options?.excludeIds ?? [];
  const canUseCache = excludeIds.length === 0;
  const cacheKey = `feed:${options?.limit ?? mobileConfig.feedBatchSize}:${options?.learningGoal ?? "default"}:${options?.themeSlug ?? "all"}:${options?.userId ?? "anonymous"}`;
  const requestKey = `${cacheKey}:${excludeIds.join(",") || "none"}`;
  const cachedFacts = canUseCache ? getCached(feedCache, cacheKey) : null;

  if (cachedFacts) {
    return cachedFacts;
  }

  const pendingFacts = pendingFeedRequests.get(requestKey);

  if (pendingFacts) {
    return pendingFacts;
  }

  const request = readFeedFacts(options, cacheKey, canUseCache, excludeIds).finally(() => {
    pendingFeedRequests.delete(requestKey);
  });
  pendingFeedRequests.set(requestKey, request);

  return request;
}

async function readFeedFacts(
  options: {
    excludeIds?: string[];
    learningGoal?: LearningGoal | null;
    limit?: number;
    themeSlug?: string | null;
    userId?: string | null;
  } | undefined,
  cacheKey: string,
  canUseCache: boolean,
  excludeIds: string[],
) {
  const supabase = getSupabaseClient();
  let rows: FeedRpcRow[] | null = null;
  let error: { code?: string; message: string } | null = null;

  if (options?.userId) {
    const personalizedResult = await withSupabaseTimeout(
      supabase.rpc("get_personalized_feed", {
        p_debug: false,
        p_limit: options?.limit ?? mobileConfig.feedBatchSize,
        p_session_id: getFeedSessionId(),
        p_theme_slug: options?.themeSlug ?? null,
        p_user_id: options.userId,
      }),
      userMessages.genericLoadError,
      0,
      "feed:get_personalized_feed",
    );
    rows = personalizedResult.data as FeedRpcRow[] | null;
    error = personalizedResult.error;
  }

  const shouldUseDiscoverFallback =
    !options?.userId ||
    Boolean(error) ||
    (rows?.length ?? 0) === 0;

  if (shouldUseDiscoverFallback) {
    const fallbackResult = await withSupabaseTimeout(
      supabase.rpc("get_discover_feed", {
        p_exclude_ids: excludeIds,
        p_learning_goal: options?.learningGoal ?? null,
        p_limit: options?.limit ?? mobileConfig.feedBatchSize,
        p_theme_slug: options?.themeSlug ?? null,
      }),
      userMessages.genericLoadError,
      0,
      "feed:get_discover_feed",
    );

    rows = fallbackResult.data as FeedRpcRow[] | null;
    error = fallbackResult.error;
  }

  if (error) {
    throw new Error(userMessages.genericLoadError);
  }

  const excludedIdSet = new Set(excludeIds);
  const facts = (rows ?? [])
    .map(mapFeedFact)
    .filter((fact) => !excludedIdSet.has(fact.id));

  if (canUseCache) {
    setCached(feedCache, cacheKey, facts);
  }

  return facts;
}

export async function getQuizStatsSummary(): Promise<QuizStatsSummary> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      averageScore: null,
      bestScore: null,
      sessionsCount: 0,
    };
  }

  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("quiz_sessions")
      .select("score,total_questions")
      .eq("user_id", user.id)
      .eq("quiz_type", "general_quizz")
      .not("completed_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),
  );

  if (error) {
    return {
      averageScore: null,
      bestScore: null,
      sessionsCount: 0,
    };
  }

  const rows = (data ?? []) as { score: number | null; total_questions: number | null }[];
  const percentages = rows
    .map((row) =>
      row.total_questions && row.total_questions > 0 && typeof row.score === "number"
        ? Math.round((row.score / row.total_questions) * 100)
        : null,
    )
    .filter((value): value is number => typeof value === "number");

  return {
    averageScore: percentages.length
      ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
      : null,
    bestScore: percentages.length ? Math.max(...percentages) : null,
    sessionsCount: rows.length,
  };
}

export async function getExplorerData(options?: {
  includeFacts?: boolean;
  query?: string;
}): Promise<ExplorerData> {
  const supabase = getSupabaseClient();
  const query = options?.query?.trim().replace(/[%,_]/g, " ").replace(/\s+/g, " ") ?? "";
  const includeFacts = options?.includeFacts ?? Boolean(query);
  const cacheKey = `explorer:${query || "default"}:${includeFacts ? "facts" : "themes"}`;
  const cachedData = getCached(explorerCache, cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const themesResult = await withSupabaseTimeout(
    supabase.rpc("get_explorer_themes", {
      p_limit: query ? 24 : 18,
      p_query: query || null,
    }),
    userMessages.genericLoadError,
    undefined,
    "themes:get_explorer_themes",
  );

  if (themesResult.error) {
    throw new Error(userMessages.genericLoadError);
  }

  const factsResult = includeFacts
    ? await withSupabaseTimeout(
        supabase.rpc("search_published_facts", {
          p_limit: 24,
          p_query: query,
        }),
        userMessages.genericLoadError,
        undefined,
        "themes:search_published_facts",
      )
    : null;

  if (factsResult?.error) {
    throw new Error(userMessages.genericLoadError);
  }

  const explorerData = {
    categories: filterCommercialCollaborationCategories(
      ((themesResult.data ?? []) as ExplorerThemeRpcRow[]).map(mapExplorerTheme),
    ),
    facts: filterCommercialCollaborationFacts(
      ((factsResult?.data ?? []) as FeedRpcRow[]).map(mapFeedFact),
    ),
    recentFacts: [],
  };

  setCached(explorerCache, cacheKey, explorerData);

  return explorerData;
}

export async function getFactActions(factIds: string[]) {
  if (factIds.length === 0) {
    return new Map<string, FactActions>();
  }

  const requestKey = [...new Set(factIds)].sort().join(",");
  const pendingActions = pendingFactActionsRequests.get(requestKey);

  if (pendingActions) {
    return pendingActions;
  }

  const request = readFactActions(factIds).finally(() => {
    pendingFactActionsRequests.delete(requestKey);
  });
  pendingFactActionsRequests.set(requestKey, request);

  return request;
}

async function readFactActions(factIds: string[]) {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const actions = new Map<string, FactActions>();
  factIds.forEach((id) => actions.set(id, { liked: false, saved: false }));

  if (!user) {
    return actions;
  }

  const [likesResult, savesResult] = await Promise.all([
    withSupabaseTimeout(
      supabase.from("likes").select("fact_id").eq("user_id", user.id).in("fact_id", factIds),
      userMessages.genericLoadError,
      0,
      "feed:get_likes",
    ),
    withSupabaseTimeout(
      supabase.from("saves").select("fact_id").eq("user_id", user.id).in("fact_id", factIds),
      userMessages.genericLoadError,
      0,
      "feed:get_saves",
    ),
  ]);

  if (likesResult.error || savesResult.error) {
    return actions;
  }

  likesResult.data?.forEach((row) => {
    actions.set(row.fact_id, { ...(actions.get(row.fact_id) ?? { liked: false, saved: false }), liked: true });
  });

  savesResult.data?.forEach((row) => {
    actions.set(row.fact_id, { ...(actions.get(row.fact_id) ?? { liked: false, saved: false }), saved: true });
  });

  return actions;
}

export async function toggleLike(factId: string, isLiked: boolean) {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(userMessages.authRequired);
  }

  const result = await withSupabaseTimeout(
    isLiked
      ? supabase.from("likes").delete().eq("user_id", user.id).eq("fact_id", factId)
      : supabase.from("likes").insert({ fact_id: factId, user_id: user.id }),
  );

  if (result.error) {
    throw new Error("Cette action n'a pas pu être effectuée.");
  }

  profileSummaryCache.delete(user.id);
}

export async function toggleSave(factId: string, isSaved: boolean) {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(userMessages.authRequired);
  }

  const result = await withSupabaseTimeout(
    isSaved
      ? supabase.from("saves").delete().eq("user_id", user.id).eq("fact_id", factId)
      : supabase.from("saves").insert({ fact_id: factId, user_id: user.id }),
  );

  if (result.error) {
    throw new Error("Cette action n'a pas pu être effectuée.");
  }

  profileSummaryCache.delete(user.id);
  savedFactsCache.delete(user.id);
}

function emptyDailyProgress(dailyGoal: number = mobileConfig.dailyGoal): DailyProgressResult {
  return {
    completedDailyGoals: 0,
    completedToday: false,
    dailyGoal,
    goalCompleted: false,
    message: getGoalCelebrationMessage(0),
    ok: false,
    uniqueViewCreated: false,
    viewedTodayCount: 0,
  };
}

export async function getTodayDailyProgress(dailyGoal?: number): Promise<DailyProgressResult> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const fallbackGoal = dailyGoal ?? mobileConfig.dailyGoal;

  if (!user) {
    return emptyDailyProgress(fallbackGoal);
  }

  const [{ data, error }, completedResult] = await Promise.all([
    withSupabaseTimeout(
      supabase
        .from("user_daily_progress")
        .select("facts_read_count,daily_goal,goal_completed")
        .eq("user_id", user.id)
        .eq("progress_date", todayKey())
        .maybeSingle(),
    ),
    withSupabaseTimeout(
      supabase
        .from("user_daily_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("goal_completed", true),
    ),
  ]);

  if (error) {
    return emptyDailyProgress(fallbackGoal);
  }

  const completedDailyGoals = completedResult.count ?? 0;

  return {
    completedDailyGoals,
    completedToday: false,
    dailyGoal: data?.daily_goal ?? fallbackGoal,
    goalCompleted: Boolean(data?.goal_completed),
    message: getGoalCelebrationMessage(completedDailyGoals),
    ok: true,
    uniqueViewCreated: false,
    viewedTodayCount: data?.facts_read_count ?? 0,
  };
}

export async function recordFactView(factId: string, dailyGoal?: number): Promise<DailyProgressResult> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return emptyDailyProgress(dailyGoal);
  }

  const { data, error } = await withSupabaseTimeout(
    supabase.rpc("record_fact_read", {
      p_daily_goal: dailyGoal ?? mobileConfig.dailyGoal,
      p_fact_id: factId,
      p_progress_date: todayKey(),
    }),
  );

  if (error) {
    return emptyDailyProgress(dailyGoal);
  }

  const row = (Array.isArray(data) ? data[0] : data) as RawDailyProgressRow | null;

  if (!row) {
    return emptyDailyProgress(dailyGoal);
  }

  const completedDailyGoals = row.completed_goals_count ?? 0;

  return {
    completedDailyGoals,
    completedToday: Boolean(row.completed_today),
    dailyGoal: row.daily_goal,
    goalCompleted: row.goal_completed,
    message: getGoalCelebrationMessage(completedDailyGoals),
    ok: true,
    uniqueViewCreated: Boolean(row.unique_view_created),
    viewedTodayCount: row.facts_read_count,
  };
}

export async function getSavedFacts() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(userMessages.authRequired);
  }

  const cachedFacts = getCached(savedFactsCache, user.id);

  if (cachedFacts) {
    return cachedFacts;
  }

  const { data, error } = await withSupabaseTimeout(
    supabase
      .from("saves")
      .select(relatedFactSelect)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  );

  if (error) {
    throw new Error(userMessages.genericLoadError);
  }

  const facts = ((data ?? []) as RelatedFactRow[])
    .map(mapRelatedFact)
    .filter(isStandardFact);

  setCached(savedFactsCache, user.id, facts);

  return facts;
}

export async function getProfileSummary(): Promise<ProfileSummary> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(userMessages.authRequired);
  }

  const cachedProfile = getCached(profileSummaryCache, user.id);

  if (cachedProfile) {
    return cachedProfile;
  }

  const today = todayKey();
  const [
    profileResult,
    likesResult,
    savesResult,
    viewsResult,
    progressResult,
    gradesResult,
    likedFactsResult,
    savedFactsResult,
    viewedThemesResult,
  ] = await Promise.all([
    withSupabaseTimeout(supabase.from("profiles").select("username,daily_goal,learning_goal,role,created_at").eq("id", user.id).maybeSingle(), userMessages.genericLoadError, undefined, "profile:read profile"),
    withSupabaseTimeout(supabase.from("likes").select("id", { count: "exact", head: true }).eq("user_id", user.id), userMessages.genericLoadError, undefined, "profile:count likes"),
    withSupabaseTimeout(supabase.from("saves").select("id", { count: "exact", head: true }).eq("user_id", user.id), userMessages.genericLoadError, undefined, "profile:count saves"),
    withSupabaseTimeout(supabase.from("user_fact_views").select("id", { count: "exact", head: true }).eq("user_id", user.id), userMessages.genericLoadError, undefined, "profile:count views"),
    withSupabaseTimeout(
      supabase
        .from("user_daily_progress")
        .select("progress_date,facts_read_count,goal_completed")
        .eq("user_id", user.id)
        .order("progress_date", { ascending: false }),
      userMessages.genericLoadError,
      undefined,
      "profile:read daily progress",
    ),
    withSupabaseTimeout(
      supabase
        .from("grades")
        .select("id,slug,name,required_goals,description,badge,display_order")
        .order("required_goals", { ascending: true })
        .order("display_order", { ascending: true }),
      userMessages.genericLoadError,
      undefined,
      "profile:read grades",
    ),
    withSupabaseTimeout(supabase.from("likes").select(relatedFactSelect).eq("user_id", user.id).order("created_at", { ascending: false }).limit(8), userMessages.genericLoadError, undefined, "profile:read liked facts"),
    withSupabaseTimeout(supabase.from("saves").select(relatedFactSelect).eq("user_id", user.id).order("created_at", { ascending: false }).limit(8), userMessages.genericLoadError, undefined, "profile:read saved facts"),
    withSupabaseTimeout(
      supabase
        .from("user_fact_views")
        .select("fact_id,facts(categories(name,slug,tone,accent_color,theme_icon,theme_image_url))")
        .eq("user_id", user.id),
      userMessages.genericLoadError,
      undefined,
      "profile:read top themes",
    ),
  ]);

  const blockingError =
    profileResult.error ??
    likesResult.error ??
    savesResult.error ??
    viewsResult.error ??
    progressResult.error ??
    likedFactsResult.error ??
    savedFactsResult.error ??
    viewedThemesResult.error;

  if (blockingError) {
    throw new Error(userMessages.genericLoadError);
  }

  const progressRows = ((progressResult.data ?? []) as DailyProgressRow[]);
  const completedDailyGoals = progressRows.filter((row) => row.goal_completed).length;
  const todayRow = progressRows.find((row) => row.progress_date === today);
  const grades = gradesResult.error ? [] : ((gradesResult.data ?? []) as GradeRow[]).map(mapGrade);
  const badge = getBadgeInfo(completedDailyGoals, grades);
  const likedFacts = ((likedFactsResult.data ?? []) as RelatedFactRow[])
    .map(mapRelatedFact)
    .filter(isStandardFact);
  const savedFacts = ((savedFactsResult.data ?? []) as RelatedFactRow[])
    .map(mapRelatedFact)
    .filter(isStandardFact);

  const summary: ProfileSummary = {
    completedDailyGoals,
    createdAt: profileResult.data?.created_at ?? user.created_at ?? null,
    dailyGoal: profileResult.data?.daily_goal ?? mobileConfig.dailyGoal,
    email: user.email ?? null,
    gradeBadge: badge.badge,
    gradeTitle: badge.title,
    id: user.id,
    learningGoal: normalizeLearningGoal(profileResult.data?.learning_goal),
    likedCount: likesResult.count ?? 0,
    likedFacts,
    role: profileResult.data?.role ?? "membre",
    savedCount: savesResult.count ?? 0,
    savedFacts,
    streakCount: getCompletedStreak(progressRows),
    topThemes: getTopViewedThemes((viewedThemesResult.data ?? []) as ViewedFactRow[]),
    todayReadCount: todayRow?.facts_read_count ?? 0,
    uniqueViewsCount: viewsResult.count ?? 0,
    weeklyGoalDays: getCurrentWeekGoalDays(progressRows),
    username: profileResult.data?.username ?? null,
  };

  setCached(profileSummaryCache, user.id, summary);

  return summary;
}

export async function shareFact(fact: FeedFact) {
  const url = getFactUrl(fact);

  await Share.share({
    message: `${fact.title}${fact.hook ? `\n\n${fact.hook}` : ""}\n\n${url}`,
    title: fact.title,
    url,
  });
}
