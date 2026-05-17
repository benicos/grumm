import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { FeedError, type FeedFact } from "@/lib/facts";
import { slugify } from "@/lib/slug";

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
  likedCount: number;
  savedCount: number;
  uniqueViewsCount: number;
  completedDailyGoals: number;
  todayReadCount: number;
  likedFacts: FeedFact[];
  savedFacts: FeedFact[];
};

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
  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);

    if (message.toLowerCase().includes("permission denied")) {
      return "Le profil n'a pas pu etre lu. Verifie les policies Supabase.";
    }

    return message;
  }

  return "Le profil est indisponible pour le moment.";
}

const RELATED_FACT_SELECT =
  "fact_id,facts(id,slug,title,hook,content,source,source_url,tone,accent_color,categories(name,slug,tone,accent_color))";

export async function getUserProfileSummary(): Promise<UserProfileSummary> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new FeedError("Supabase n'est pas configure.");
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
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username,daily_goal")
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
    likedCount: likedFacts.length,
    savedCount: savedFacts.length,
    uniqueViewsCount: uniqueViews.size,
    completedDailyGoals: dailyRows.filter((row) => row.goal_completed).length,
    todayReadCount: todayRow?.facts_read_count ?? 0,
    likedFacts,
    savedFacts,
  };
}
