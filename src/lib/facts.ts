import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { dailyGoalConfig, discoverConfig } from "@/config/app";
import { publicSiteTexts } from "@/config/site-texts";
import {
  filterCommercialCollaborationCategories,
  filterCommercialCollaborationFacts,
} from "@/lib/commercial";
import { formatAppError, logAppError } from "@/lib/errors";
import {
  DEFAULT_DIFFICULTY_LEVEL,
  type DifficultyLevel,
  type LearningGoal,
  normalizeDifficultyLevel,
} from "@/lib/learning";
import { slugify } from "@/lib/slug";
import { getThemeTone } from "@/lib/themeDisplay";

export const DEFAULT_DAILY_GOAL: number = dailyGoalConfig.defaultGoal;
export const DISCOVER_FEED_BATCH_SIZE: number = discoverConfig.feedBatchSize;

export type FeedFact = {
  id: string;
  slug: string;
  category: string;
  categorySlug: string;
  title: string;
  hook: string | null;
  detail: string;
  difficultyLevel: DifficultyLevel;
  longContent: string | null;
  seoDescription: string | null;
  seoTitle: string | null;
  source: string | null;
  sourceUrl: string | null;
  eventDay: number | null;
  eventMonth: number | null;
  eventYear: number | null;
  publishedAt: string | null;
  updatedAt: string | null;
  tone: string;
  accent: string;
  visualMotif?: string | null;
};

type FeedFactWithScore = FeedFact & {
  recommendationScore?: number;
  recommendationScoreBreakdown?: Record<string, unknown> | null;
};

export type RelatedFactSuggestion = FeedFact & {
  relationReason: "manual" | "same_theme" | "same_period" | "recent";
};

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  tone: string;
  accent: string;
  count?: number;
  description_courte?: string | null;
  description_longue?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  keywords?: string[] | null;
  visual_motif?: string | null;
  gradient_start?: string | null;
  gradient_middle?: string | null;
  gradient_end?: string | null;
  theme_icon?: string | null;
};

export type ThemeDiscoverySummary = CategorySummary & {
  description: string;
  sampleFacts: string[];
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
  tone: string | null;
  accent_color: string | null;
  description_courte?: string | null;
  description_longue?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  keywords?: string[] | null;
  visual_motif?: string | null;
  gradient_start?: string | null;
  gradient_middle?: string | null;
  gradient_end?: string | null;
  theme_icon?: string | null;
};

type FactRow = {
  id: string;
  slug?: string | null;
  title: string;
  hook: string | null;
  content: string;
  difficulty_level?: DifficultyLevel | null;
  event_day?: number | null;
  event_month?: number | null;
  event_year?: number | null;
  long_content?: string | null;
  seo_description?: string | null;
  seo_title?: string | null;
  source: string | null;
  source_url?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  tone: string | null;
  accent_color: string | null;
  categories: FactCategory | FactCategory[] | null;
};

type FeedRpcRow = {
  id: string;
  slug: string;
  title: string;
  hook: string | null;
  content: string;
  difficulty_level?: DifficultyLevel | null;
  event_day?: number | null;
  event_month?: number | null;
  event_year?: number | null;
  long_content?: string | null;
  seo_description?: string | null;
  seo_title?: string | null;
  source: string | null;
  source_url: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  tone: string | null;
  accent_color: string | null;
  category_id: string;
  category_name: string;
  category_slug: string;
  category_tone: string;
  category_accent_color: string;
  recommendation_score?: number | null;
  score_debug?: Record<string, unknown> | null;
};

type ThemeSampleRow = {
  title: string;
  category_id: string | null;
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
  "id,slug,title,hook,content,difficulty_level,long_content,seo_title,seo_description,event_day,event_month,event_year,published_at,updated_at,source,source_url,tone,accent_color,categories(id,name,slug,tone,accent_color,description_courte,description_longue,seo_title,seo_description,keywords,visual_motif,theme_icon,gradient_start,gradient_middle,gradient_end)";

function isMissingSourceLabel(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return (
    normalized === "source non renseignee" ||
    normalized === "source: source non renseignee" ||
    normalized === "source : source non renseignee"
  );
}

export function cleanFactSource(value?: string | null) {
  const text = value?.trim();

  return text && !isMissingSourceLabel(text) ? text : null;
}

function cleanOptionalText(value?: string | null) {
  const text = value?.trim();

  return text ? text : null;
}

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
    hook: fact.hook?.trim() || null,
    detail: fact.content,
    difficultyLevel: normalizeDifficultyLevel(fact.difficulty_level),
    longContent: fact.long_content?.trim() || null,
    seoDescription: cleanOptionalText(fact.seo_description),
    seoTitle: cleanOptionalText(fact.seo_title),
    source: cleanFactSource(fact.source),
    sourceUrl: cleanOptionalText(fact.source_url),
    eventDay: fact.event_day ?? null,
    eventMonth: fact.event_month ?? null,
    eventYear: fact.event_year ?? null,
    publishedAt: fact.published_at ?? null,
    updatedAt: fact.updated_at ?? null,
    tone:
      fact.tone ??
      (category ? getThemeTone(category) : null) ??
      "from-[#0b1424] via-[#132744] to-[#f0a95a]",
    accent: fact.accent_color ?? category?.accent_color ?? "#ffd166",
    visualMotif: category?.visual_motif ?? null,
  };
}

function mapFeedRpcFact(fact: FeedRpcRow): FeedFact {
  return {
    id: fact.id,
    slug: fact.slug || slugify(fact.title),
    category: fact.category_name ?? "General",
    categorySlug: fact.category_slug ?? "general",
    title: fact.title,
    hook: fact.hook?.trim() || null,
    detail: fact.content,
    difficultyLevel: normalizeDifficultyLevel(
      fact.difficulty_level ?? DEFAULT_DIFFICULTY_LEVEL,
    ),
    longContent: fact.long_content?.trim() || null,
    seoDescription: cleanOptionalText(fact.seo_description),
    seoTitle: cleanOptionalText(fact.seo_title),
    source: cleanFactSource(fact.source),
    sourceUrl: cleanOptionalText(fact.source_url),
    eventDay: fact.event_day ?? null,
    eventMonth: fact.event_month ?? null,
    eventYear: fact.event_year ?? null,
    publishedAt: fact.published_at ?? null,
    updatedAt: fact.updated_at ?? null,
    tone:
      fact.tone ??
      fact.category_tone ??
      "from-[#0b1424] via-[#132744] to-[#f0a95a]",
    accent: fact.accent_color ?? fact.category_accent_color ?? "#ffd166",
    visualMotif: null,
  };
}

function mapCategory(category: FactCategory): CategorySummary {
  return {
    accent: category.accent_color || "#ffd166",
    description_courte: category.description_courte ?? null,
    description_longue: category.description_longue ?? null,
    gradient_end: category.gradient_end ?? null,
    gradient_middle: category.gradient_middle ?? null,
    gradient_start: category.gradient_start ?? null,
    id: category.id,
    keywords: category.keywords ?? null,
    name: category.name,
    seo_description: category.seo_description ?? null,
    seo_title: category.seo_title ?? null,
    slug: category.slug,
    theme_icon: category.theme_icon ?? null,
    tone:
      category.tone ||
      "from-[#0b1424] via-[#132744] to-[#f0a95a]",
    visual_motif: category.visual_motif ?? null,
  };
}

function getThemeDescription(theme: CategorySummary) {
  if (theme.description_courte?.trim() || theme.description_longue?.trim()) {
    return theme.description_courte?.trim() || theme.description_longue?.trim() || "";
  }

  return publicSiteTexts.themeDescriptionFallback;
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

function getDebugNumber(debug: Record<string, unknown> | null | undefined, key: string) {
  const value = debug?.[key];

  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getThemeQuota(position: number) {
  if (position < 4) {
    return 1;
  }

  if (position < 10) {
    return 2;
  }

  if (position < 15) {
    return 3;
  }

  return Number.POSITIVE_INFINITY;
}

function getDiversityPenalty(
  fact: FeedFactWithScore,
  selected: FeedFactWithScore[],
  recentCategorySlugs: string[],
) {
  const selectedSlugs = selected.map((item) => item.categorySlug);
  const recentWindow = [...recentCategorySlugs, ...selectedSlugs].slice(-10);
  const lastThreeCount = recentWindow
    .slice(-3)
    .filter((slug) => slug === fact.categorySlug).length;
  const lastTenCount = recentWindow.filter((slug) => slug === fact.categorySlug).length;
  const firstFifteenCount = selectedSlugs
    .slice(0, 15)
    .filter((slug) => slug === fact.categorySlug).length;

  return lastThreeCount * 28 + Math.max(0, lastTenCount - 1) * 14 + firstFifteenCount * 8;
}

function diversifyFeedFacts({
  facts,
  limit,
  recentCategorySlugs,
  shouldDiversify,
}: {
  facts: FeedFactWithScore[];
  limit: number;
  recentCategorySlugs: string[];
  shouldDiversify: boolean;
}) {
  if (!shouldDiversify) {
    return facts.slice(0, limit);
  }

  const remaining = facts.map((fact, originalIndex) => ({
    fact,
    originalIndex,
  }));
  const selected: FeedFactWithScore[] = [];
  const themeCounts = new Map<string, number>();

  while (selected.length < limit && remaining.length > 0) {
    const quota = getThemeQuota(selected.length);
    let bestIndex = -1;
    let bestScore = Number.NEGATIVE_INFINITY;

    remaining.forEach(({ fact, originalIndex }, index) => {
      const themeCount = themeCounts.get(fact.categorySlug) ?? 0;

      if (themeCount >= quota) {
        return;
      }

      const debug = fact.recommendationScoreBreakdown;
      const rawScore = fact.recommendationScore ?? 0;
      const themeAffinityBonus = getDebugNumber(debug, "theme_affinity_bonus");
      const themeAffinityAdjustment = themeAffinityBonus * 0.65;
      const diversityPenalty = getDiversityPenalty(
        fact,
        selected,
        recentCategorySlugs,
      );
      const score =
        rawScore -
        themeAffinityAdjustment -
        diversityPenalty -
        originalIndex * 0.001;

      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    });

    if (bestIndex === -1) {
      remaining.forEach(({ fact, originalIndex }, index) => {
        const debug = fact.recommendationScoreBreakdown;
        const rawScore = fact.recommendationScore ?? 0;
        const themeAffinityBonus = getDebugNumber(debug, "theme_affinity_bonus");
        const diversityPenalty = getDiversityPenalty(
          fact,
          selected,
          recentCategorySlugs,
        );
        const score =
          rawScore -
          themeAffinityBonus * 0.65 -
          diversityPenalty -
          originalIndex * 0.001;

        if (score > bestScore) {
          bestIndex = index;
          bestScore = score;
        }
      });
    }

    const [picked] = remaining.splice(bestIndex, 1);
    const debug = picked.fact.recommendationScoreBreakdown;
    const rawScore = picked.fact.recommendationScore ?? 0;
    const themeAffinityBonus = getDebugNumber(debug, "theme_affinity_bonus");
    const diversityPenalty = getDiversityPenalty(
      picked.fact,
      selected,
      recentCategorySlugs,
    );
    const finalScore =
      rawScore -
      themeAffinityBonus * 0.65 -
      diversityPenalty;

    picked.fact.recommendationScore = finalScore;
    picked.fact.recommendationScoreBreakdown = {
      ...(debug ?? {}),
      diversity_penalty: diversityPenalty,
      final_position: selected.length + 1,
      final_score_before_diversity: rawScore,
      theme_affinity_adjustment: themeAffinityBonus * 0.65,
    };
    selected.push(picked.fact);
    themeCounts.set(
      picked.fact.categorySlug,
      (themeCounts.get(picked.fact.categorySlug) ?? 0) + 1,
    );
  }

  return selected;
}

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getBoundedDailyGoal(dailyGoal: number) {
  return Math.max(
    dailyGoalConfig.minGoal,
    Math.min(dailyGoal, dailyGoalConfig.maxGoal),
  );
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
  debug?: boolean;
  excludeIds?: string[];
  learningGoal?: LearningGoal | null;
  limit?: number;
  recentCategorySlugs?: string[];
  sessionId?: string | null;
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
      .select("id,name,slug,tone,accent_color,description_courte,description_longue,seo_title,seo_description,keywords,visual_motif,theme_icon,gradient_start,gradient_middle,gradient_end")
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

  const limit = options?.limit ?? DISCOVER_FEED_BATCH_SIZE;
  const candidateLimit = options?.themeSlug ? limit : Math.max(limit * 3, 30);
  const { userId } = await getCurrentUserId();
  const personalizedResult = await supabase.rpc("get_personalized_feed", {
    p_debug: options?.debug ?? false,
    p_limit: candidateLimit,
    p_session_id: options?.sessionId ?? null,
    p_theme_slug: options?.themeSlug ?? null,
    p_user_id: userId,
  });

  let feedRows: FeedRpcRow[] = [];

  if (!personalizedResult.error) {
    feedRows = (personalizedResult.data ?? []) as FeedRpcRow[];
  } else if (
    personalizedResult.error.code === "42883" ||
    personalizedResult.error.message.toLowerCase().includes("get_personalized_feed")
  ) {
    logAppError(personalizedResult.error, {
      operation: "read personalized feed fallback",
      source: "Supabase",
      table: "get_personalized_feed",
    });

    const fallbackResult = await supabase.rpc("get_discover_feed", {
      p_exclude_ids: options?.excludeIds ?? [],
      p_learning_goal: options?.learningGoal ?? null,
      p_limit: candidateLimit,
      p_theme_slug: options?.themeSlug ?? null,
    });

    if (fallbackResult.error) {
      throw new FeedError(
        getSupabaseDataErrorMessage(fallbackResult.error, {
          operation: "read discover facts fallback",
          table: "facts",
        }),
      );
    }

    feedRows = (fallbackResult.data ?? []) as FeedRpcRow[];
  } else {
    throw new FeedError(
      getSupabaseDataErrorMessage(personalizedResult.error, {
        operation: "read personalized feed",
        table: "facts",
      }),
    );
  }

  const excludedIds = new Set(options?.excludeIds ?? []);
  const candidateFacts = uniqueFactsById(feedRows.map(mapFeedRpcFact))
    .filter((fact) => !excludedIds.has(fact.id))
    .map((fact) => {
      const row = feedRows.find((item) => item.id === fact.id);
      const scoredFact = fact as FeedFactWithScore;

      if (typeof row?.recommendation_score === "number") {
        scoredFact.recommendationScore = row.recommendation_score;
      }

      scoredFact.recommendationScoreBreakdown = row?.score_debug ?? null;

      return scoredFact;
    });
  const rankedFeedFacts = diversifyFeedFacts({
    facts: candidateFacts,
    limit,
    recentCategorySlugs: options?.recentCategorySlugs ?? [],
    shouldDiversify: !options?.themeSlug,
  });

  return {
    facts: rankedFeedFacts,
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
  limit = 18,
) {
  // Source de vérité des thèmes: lecture directe de categories avec les champs
  // éditoriaux. Le RPC historique ne renvoie pas toujours visual_motif /
  // descriptions / gradients, ce qui forçait des fallbacks sur /theme.
  const categoriesQuery = supabase
    .from("categories")
    .select("id,name,slug,tone,accent_color,description_courte,description_longue,seo_title,seo_description,keywords,visual_motif,theme_icon,gradient_start,gradient_middle,gradient_end")
    .order("name", { ascending: true });

  const categoriesResult = searchTerm
    ? await categoriesQuery.or(
        `name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`,
      )
    : await categoriesQuery.limit(limit);

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
    .select("id,name,slug,tone,accent_color,description_courte,description_longue,seo_title,seo_description,keywords,visual_motif,theme_icon,gradient_start,gradient_middle,gradient_end")
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
    categories: filterCommercialCollaborationCategories(categories),
    facts: filterCommercialCollaborationFacts(facts),
    recentFacts: filterCommercialCollaborationFacts(recentFacts),
    source: "supabase" as const,
  };
}

export async function getAllExplorerThemes(limit = 200) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return {
      categories: [] as CategorySummary[],
      source: "unavailable" as const,
    };
  }

  const categories = await getExplorerThemesWithCounts(supabase, "", limit);

  return {
    categories: filterCommercialCollaborationCategories(categories),
    source: "supabase" as const,
  };
}

export async function getThemeDiscoverySummaries(
  limit = 200,
): Promise<ThemeDiscoverySummary[]> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return [];
  }

  const themes = filterCommercialCollaborationCategories(
    await getExplorerThemesWithCounts(supabase, "", limit),
  );

  if (themes.length === 0) {
    return [];
  }

  const samplesResult = await supabase
    .from("facts")
    .select("title,category_id")
    .eq("status", "published")
    .in("category_id", themes.map((theme) => theme.id))
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(90, themes.length * 4));

  if (samplesResult.error) {
    throw new FeedError(
      getSupabaseDataErrorMessage(samplesResult.error, {
        operation: "read theme discovery samples",
        table: "facts",
      }),
    );
  }

  const samplesByThemeId = new Map<string, string[]>();
  ((samplesResult.data ?? []) as ThemeSampleRow[]).forEach((fact) => {
    if (!fact.category_id || !fact.title?.trim()) {
      return;
    }

    const current = samplesByThemeId.get(fact.category_id) ?? [];

    if (current.length >= 3) {
      return;
    }

    samplesByThemeId.set(fact.category_id, [...current, fact.title.trim()]);
  });

  return themes.map((theme) => ({
    ...theme,
    description: getThemeDescription(theme),
    sampleFacts: samplesByThemeId.get(theme.id) ?? [],
  }));
}

export async function getPopularExplorerSearches(limit = 6) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return [] as string[];
  }

  const { data, error } = await supabase
    .from("analytics_events")
    .select("metadata")
    .eq("event_name", "explorer_search")
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    return [];
  }

  const counts = new Map<string, number>();

  (data ?? []).forEach((event) => {
    const metadata = event.metadata;

    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return;
    }

    const term = metadata.term;

    if (typeof term !== "string" || term.trim().length < 2) {
      return;
    }

    const normalized = term.trim().replace(/\s+/g, " ");
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .slice(0, limit)
    .map(([term]) => term);
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
      const fact = mapFeedRpcFact(row as FeedRpcRow);
      const themeResult = await supabase
        .from("categories")
        .select("visual_motif")
        .eq("slug", fact.categorySlug)
        .maybeSingle();

      return {
        fact: {
          ...fact,
          visualMotif: themeResult.error
            ? null
            : themeResult.data?.visual_motif ?? null,
        },
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

export async function getTodayEventFact() {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    const fallback = await getFactOfTheDay();

    return {
      ...fallback,
      isEditorialDate: false,
      yearsAgo: null as number | null,
    };
  }

  const today = new Date();
  const { data, error } = await supabase
    .from("facts")
    .select(FACT_SELECT)
    .eq("status", "published")
    .eq("event_month", today.getMonth() + 1)
    .eq("event_day", today.getDate())
    .order("event_year", { ascending: true, nullsFirst: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (!error && data?.[0]) {
    const fact = mapFact(data[0] as FactRow);
    const yearsAgo =
      typeof fact.eventYear === "number"
        ? Math.max(today.getFullYear() - fact.eventYear, 0)
        : null;

    return {
      fact,
      interactionCount: 0,
      isEditorialDate: true,
      source: "supabase" as const,
      yearsAgo,
    };
  }

  const fallback = await getFactOfTheDay();

  return {
    ...fallback,
    isEditorialDate: false,
    yearsAgo: null as number | null,
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

function uniqueRelatedFacts(facts: RelatedFactSuggestion[], currentFactId: string) {
  const seen = new Set<string>([currentFactId]);

  return facts.filter((fact) => {
    if (seen.has(fact.id)) {
      return false;
    }

    seen.add(fact.id);
    return true;
  });
}

export async function getRelatedFactsForFact(
  factId: string,
  limit = 5,
): Promise<RelatedFactSuggestion[]> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return [];
  }

  const { data: currentFact } = await supabase
    .from("facts")
    .select("id,category_id,event_year")
    .eq("id", factId)
    .maybeSingle();

  if (!currentFact) {
    return [];
  }

  let manualIds: string[] = [];

  try {
    const { data: relations } = await supabase
      .from("fact_relations")
      .select("related_fact_id,position")
      .eq("source_fact_id", factId)
      .order("position", { ascending: true })
      .limit(limit);

    manualIds = ((relations ?? []) as { related_fact_id: string }[]).map(
      (relation) => relation.related_fact_id,
    );
  } catch {
    manualIds = [];
  }

  const manualResult =
    manualIds.length > 0
      ? await supabase
          .from("facts")
          .select(FACT_SELECT)
          .in("id", manualIds)
          .eq("status", "published")
      : { data: [] as FactRow[] };
  const manualFacts = manualIds
    .map((id) => ((manualResult.data ?? []) as FactRow[]).find((fact) => fact.id === id))
    .filter(Boolean)
    .map((fact) => ({
      ...mapFact(fact as FactRow),
      relationReason: "manual" as const,
    }));
  const needed = Math.max(limit - manualFacts.length, 0);

  if (needed <= 0) {
    return uniqueRelatedFacts(manualFacts, factId).slice(0, limit);
  }

  const sameThemeResult = await supabase
    .from("facts")
    .select(FACT_SELECT)
    .eq("status", "published")
    .eq("category_id", currentFact.category_id)
    .neq("id", factId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(needed + 4);
  const sameThemeFacts = ((sameThemeResult.data ?? []) as FactRow[]).map((fact) => ({
    ...mapFact(fact),
    relationReason: "same_theme" as const,
  }));
  const samePeriodResult = currentFact.event_year
    ? await supabase
        .from("facts")
        .select(FACT_SELECT)
        .eq("status", "published")
        .gte("event_year", currentFact.event_year - 25)
        .lte("event_year", currentFact.event_year + 25)
        .neq("id", factId)
        .order("event_year", { ascending: true, nullsFirst: false })
        .limit(needed + 2)
    : { data: [] as FactRow[] };
  const samePeriodFacts = ((samePeriodResult.data ?? []) as FactRow[]).map((fact) => ({
    ...mapFact(fact),
    relationReason: "same_period" as const,
  }));
  const recentResult = await supabase
    .from("facts")
    .select(FACT_SELECT)
    .eq("status", "published")
    .neq("id", factId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(needed + 4);
  const recentFacts = ((recentResult.data ?? []) as FactRow[]).map((fact) => ({
    ...mapFact(fact),
    relationReason: "recent" as const,
  }));

  return uniqueRelatedFacts(
    [...manualFacts, ...sameThemeFacts, ...samePeriodFacts, ...recentFacts],
    factId,
  ).slice(0, limit);
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
