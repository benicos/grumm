import { Share } from "react-native";

import { mobileConfig, userMessages } from "../config/app";
import type {
  CategorySummary,
  DailyProgressResult,
  ExplorerData,
  FactActions,
  FeedFact,
  ProfileSummary,
  RelatedFactRow,
  ThemeViewStat,
} from "../types/domain";
import { getBadgeInfo, getGoalCelebrationMessage, type GradeDefinition } from "./badges";
import { slugify } from "./slug";
import { getSupabaseClient } from "./supabase";

type FeedRpcRow = {
  accent_color: string | null;
  category_accent_color: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  category_tone: string;
  content: string;
  hook: string | null;
  id: string;
  slug: string;
  source: string;
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
              name: string;
              slug: string;
              tone: string;
            }
          | {
              accent_color: string;
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
  "fact_id,facts(id,slug,title,hook,content,source,source_url,tone,accent_color,categories(name,slug,tone,accent_color))";

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
    hook: row.hook?.trim() || null,
    id: row.id,
    slug: row.slug || slugify(row.title),
    source: row.source || "Source non renseignée",
    sourceUrl: row.source_url ?? null,
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
    hook: fact.hook?.trim() || null,
    id: fact.id,
    slug: fact.slug || slugify(fact.title),
    source: fact.source || "Source non renseignée",
    sourceUrl: fact.source_url ?? null,
    title: fact.title,
    tone: fact.tone ?? category?.tone ?? "premium",
  };
}

function mapCategory(category: CategoryRow): CategorySummary {
  return {
    accent: category.accent_color,
    id: category.id,
    name: category.name,
    slug: category.slug,
    tone: category.tone,
  };
}

function getTopViewedThemes(rows: ViewedFactRow[]): ThemeViewStat[] {
  const themesBySlug = new Map<string, Omit<ThemeViewStat, "percent">>();

  rows.forEach((row) => {
    const category = Array.isArray(row.facts?.categories)
      ? row.facts?.categories[0]
      : row.facts?.categories;

    if (!category?.slug) {
      return;
    }

    const current = themesBySlug.get(category.slug);
    themesBySlug.set(category.slug, {
      accent: category.accent_color || "#ffd166",
      count: (current?.count ?? 0) + 1,
      name: category.name,
      slug: category.slug,
    });
  });

  const themes = [...themesBySlug.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"))
    .slice(0, 5);
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

export function getFactUrl(fact: FeedFact) {
  return `${mobileConfig.siteUrl.replace(/\/$/, "")}/fact/${fact.slug}`;
}

export async function getFeedFacts(options?: {
  excludeIds?: string[];
  limit?: number;
}) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("get_discover_feed", {
    p_exclude_ids: options?.excludeIds ?? [],
    p_limit: options?.limit ?? mobileConfig.feedBatchSize,
    p_theme_slug: null,
  });

  if (error) {
    throw new Error(userMessages.genericLoadError);
  }

  return ((data ?? []) as FeedRpcRow[]).map(mapFeedFact);
}

export async function getExplorerData(options?: { query?: string }): Promise<ExplorerData> {
  const supabase = getSupabaseClient();
  const query = options?.query?.trim().replace(/[%,_]/g, " ").replace(/\s+/g, " ") ?? "";

  const themesResult = await supabase.rpc("get_explorer_themes", {
    p_limit: query ? 24 : 18,
    p_query: query || null,
  });

  if (themesResult.error) {
    throw new Error(userMessages.genericLoadError);
  }

  const factsResult = query
    ? await supabase.rpc("search_published_facts", {
        p_limit: 24,
        p_query: query,
      })
    : await supabase.rpc("get_discover_feed", {
      p_exclude_ids: [],
      p_limit: 12,
      p_theme_slug: null,
    });

  if (factsResult.error) {
    throw new Error(userMessages.genericLoadError);
  }

  const recentFactsResult = await supabase
    .from("facts")
    .select("id,slug,title,hook,content,source,source_url,tone,accent_color,categories(name,slug,tone,accent_color)")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(8);

  const recentFacts = recentFactsResult.error
    ? []
    : ((recentFactsResult.data ?? []) as RelatedFactRow["facts"][])
        .map((fact) => (fact ? mapRelatedFact({ fact_id: fact.id, facts: fact }) : null))
        .filter((fact): fact is FeedFact => Boolean(fact));

  return {
    categories: ((themesResult.data ?? []) as ExplorerThemeRpcRow[]).map(mapExplorerTheme),
    facts: ((factsResult.data ?? []) as FeedRpcRow[]).map(mapFeedFact),
    recentFacts,
  };
}

export async function getFactActions(factIds: string[]) {
  if (factIds.length === 0) {
    return new Map<string, FactActions>();
  }

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
    supabase.from("likes").select("fact_id").eq("user_id", user.id).in("fact_id", factIds),
    supabase.from("saves").select("fact_id").eq("user_id", user.id).in("fact_id", factIds),
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

  const result = isLiked
    ? await supabase.from("likes").delete().eq("user_id", user.id).eq("fact_id", factId)
    : await supabase.from("likes").insert({ fact_id: factId, user_id: user.id });

  if (result.error) {
    throw new Error("Cette action n'a pas pu être effectuée.");
  }
}

export async function toggleSave(factId: string, isSaved: boolean) {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(userMessages.authRequired);
  }

  const result = isSaved
    ? await supabase.from("saves").delete().eq("user_id", user.id).eq("fact_id", factId)
    : await supabase.from("saves").insert({ fact_id: factId, user_id: user.id });

  if (result.error) {
    throw new Error("Cette action n'a pas pu être effectuée.");
  }
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
    supabase
      .from("user_daily_progress")
      .select("facts_read_count,daily_goal,goal_completed")
      .eq("user_id", user.id)
      .eq("progress_date", todayKey())
      .maybeSingle(),
    supabase
      .from("user_daily_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("goal_completed", true),
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

  const { data, error } = await supabase.rpc("record_fact_read", {
    p_daily_goal: dailyGoal ?? mobileConfig.dailyGoal,
    p_fact_id: factId,
    p_progress_date: todayKey(),
  });

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

  const { data, error } = await supabase
    .from("saves")
    .select(relatedFactSelect)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(userMessages.genericLoadError);
  }

  return ((data ?? []) as RelatedFactRow[]).map(mapRelatedFact).filter((fact): fact is FeedFact => Boolean(fact));
}

export async function getProfileSummary(): Promise<ProfileSummary> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(userMessages.authRequired);
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
    supabase.from("profiles").select("username,daily_goal,role").eq("id", user.id).maybeSingle(),
    supabase.from("likes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("saves").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("user_fact_views").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("user_daily_progress")
      .select("progress_date,facts_read_count,goal_completed")
      .eq("user_id", user.id)
      .order("progress_date", { ascending: false }),
    supabase
      .from("grades")
      .select("id,slug,name,required_goals,description,badge,display_order")
      .order("required_goals", { ascending: true })
      .order("display_order", { ascending: true }),
    supabase.from("likes").select(relatedFactSelect).eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
    supabase.from("saves").select(relatedFactSelect).eq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
    supabase
      .from("user_fact_views")
      .select("fact_id,facts(categories(name,slug,tone,accent_color))")
      .eq("user_id", user.id),
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
    .filter((fact): fact is FeedFact => Boolean(fact));
  const savedFacts = ((savedFactsResult.data ?? []) as RelatedFactRow[])
    .map(mapRelatedFact)
    .filter((fact): fact is FeedFact => Boolean(fact));

  return {
    completedDailyGoals,
    dailyGoal: profileResult.data?.daily_goal ?? mobileConfig.dailyGoal,
    email: user.email ?? null,
    gradeBadge: badge.badge,
    gradeTitle: badge.title,
    id: user.id,
    likedCount: likesResult.count ?? 0,
    likedFacts,
    role: profileResult.data?.role ?? "membre",
    savedCount: savesResult.count ?? 0,
    savedFacts,
    streakCount: getCompletedStreak(progressRows),
    topThemes: getTopViewedThemes((viewedThemesResult.data ?? []) as ViewedFactRow[]),
    todayReadCount: todayRow?.facts_read_count ?? 0,
    uniqueViewsCount: viewsResult.count ?? 0,
    username: profileResult.data?.username ?? null,
  };
}

export async function shareFact(fact: FeedFact) {
  const url = getFactUrl(fact);

  await Share.share({
    message: `${fact.title}${fact.hook ? `\n\n${fact.hook}` : ""}\n\n${url}`,
    title: fact.title,
    url,
  });
}
