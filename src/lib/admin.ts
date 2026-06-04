import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { gradeIconOptions, paginationConfig } from "@/config/app";
import { getBadgeInfo } from "@/lib/badges";
import { isCommercialCollaborationSlug } from "@/lib/commercial";
import { formatAppError, getConfiguredErrorMessage } from "@/lib/errors";
import {
  type DifficultyLevel,
  normalizeDifficultyLevel,
} from "@/lib/learning";
import {
  normalizeQuizDifficulty,
  type QuizDifficulty,
} from "@/lib/quizShared";
import type { PermissionKey, UserRole } from "@/lib/roles";
import {
  getDefaultRolePermissions,
  hasPermission,
} from "@/lib/roles";
import { slugify } from "@/lib/slug";
import type { Database } from "@/types/database";

export type AdminCategory = Database["public"]["Tables"]["categories"]["Row"];
export type AdminProfile = Database["public"]["Tables"]["profiles"]["Row"] & {
  email?: string | null;
};
export type AdminRole = Database["public"]["Tables"]["roles"]["Row"];
export type AdminGrade = Database["public"]["Tables"]["grades"]["Row"];
export type FactStatus = Database["public"]["Tables"]["facts"]["Row"]["status"];
export type AdminFactAuthor = Pick<AdminProfile, "id" | "role" | "username">;
export type AdminFact = Database["public"]["Tables"]["facts"]["Row"] & {
  authorProfile?: AdminFactAuthor | null;
  categories: Pick<AdminCategory, "name" | "slug"> | null;
  quizQuestion?: Pick<AdminQuizQuestion, "id" | "question" | "is_active"> | null;
  relatedFacts?: AdminRelatedFact[];
};
export type AdminRelatedFact = Pick<AdminFact, "id" | "slug" | "title"> & {
  categoryName: string | null;
  position: number;
  relationId: string;
};
export type AdminQuizQuestion =
  Database["public"]["Tables"]["quiz_questions"]["Row"] & {
    facts:
      | (Pick<AdminFact, "id" | "title" | "slug"> & {
          categories: Pick<AdminCategory, "name" | "slug"> | null;
        })
      | null;
  };
export type AdminUserThemeStat = {
  accent: string;
  count: number;
  name: string;
  slug: string;
};
export type AdminUserActivity = {
  accent: string;
  at: string;
  factSlug: string;
  factTitle: string;
  label: string;
  type: "like" | "save" | "view";
};
export type AdminUserDetail = {
  profile: AdminProfile;
  roleName: string | null;
  gradeBadge: string | null;
  gradeName: string | null;
  stats: {
    completedGoals: number;
    currentStreak: number;
    interactions: number;
    likedFacts: number;
    savedFacts: number;
    viewedFacts: number;
  };
  recentActivity: AdminUserActivity[];
  topThemes: AdminUserThemeStat[];
};

export const FACT_STATUS_LABELS: Record<FactStatus, string> = {
  archived: "Archivé",
  draft: "Brouillon",
  pending_review: "En attente",
  published: "Publié",
  rejected: "Rejeté",
};

export type AdminListResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminDashboardData = {
  role: UserRole;
  stats: {
    label: string;
    value: number;
  }[];
  pendingFacts: AdminFact[];
  pendingFactsCount: number;
  recentFacts: AdminFact[];
  recentProfiles: AdminProfile[];
};

export type AdminDashboardSeriesPoint = {
  label: string;
  current: number;
  previous: number;
};

export type AdminAnalyticsMetric = {
  current: number;
  previous: number;
};

export type AdminAnalyticsData = {
  overview: {
    activeUsersToday: AdminAnalyticsMetric;
    averageReadSecondsToday: AdminAnalyticsMetric;
    factsReadToday: AdminAnalyticsMetric;
    goalsCompletedToday: AdminAnalyticsMetric;
  };
  series: {
    activeUsers: AdminDashboardSeriesPoint[];
    averageSwipeSeconds: AdminDashboardSeriesPoint[];
    factReads: AdminDashboardSeriesPoint[];
    registrations: AdminDashboardSeriesPoint[];
  };
  topContent: {
    explorerSearches: AdminAnalyticsSearchStat[];
    readFacts: AdminAnalyticsFactStat[];
    readThemes: AdminAnalyticsThemeStat[];
    savedFacts: AdminAnalyticsFactStat[];
  };
  health: {
    averageFactsPerUserDay: number | null;
    averageSessionsPerDay: number | null;
    d1ReturnRate: number | null;
    d7ReturnRate: number | null;
  };
};

export type AdminAnalyticsFactStat = {
  id: string;
  slug: string;
  title: string;
  value: number;
};

export type AdminAnalyticsThemeStat = {
  accent: string;
  name: string;
  slug: string;
  value: number;
};

export type AdminAnalyticsSearchStat = {
  id: string;
  noResultCount: number;
  term: string;
  value: number;
};

export type AdminFeedDebugRow = {
  categoryName: string;
  id: string;
  score: number;
  scoreDebug: Record<string, unknown>;
  title: string;
};

type AdminMutationResult =
  | { id?: string; ok: true; message: string }
  | { ok: false; message: string };

type AdminAuth = Awaited<ReturnType<typeof getAuthenticatedAdminClient>>;
type AdminClient = Extract<AdminAuth, { ok: true }>["supabase"];

const DEFAULT_PAGE_SIZE: number = paginationConfig.adminDefaultPageSize;
const ADMIN_FACT_SELECT =
  "id,category_id,slug,title,hook,content,difficulty_level,long_content,seo_title,seo_description,event_day,event_month,event_year,source,source_url,status,published_at,display_order,tone,accent_color,created_at,updated_at,categories(name,slug)";
const ADMIN_QUIZ_SELECT =
  "id,fact_id,question,correct_answer,wrong_answer_1,wrong_answer_2,wrong_answer_3,difficulty,is_active,created_at,updated_at,facts(id,title,slug,categories(name,slug))";

function normalizeSearchTerm(query?: string) {
  return query?.trim().replace(/[%,_]/g, " ").replace(/\s+/g, " ") ?? "";
}

function getRange(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(
    1,
    Math.min(pageSize, paginationConfig.adminMaxPageSize),
  );
  const from = (safePage - 1) * safePageSize;

  return {
    from,
    page: safePage,
    pageSize: safePageSize,
    to: from + safePageSize - 1,
  };
}

async function getAuthenticatedAdminClient() {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false as const, message: getConfiguredErrorMessage() };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, message: "Connexion requise." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false as const,
      message: formatAppError(profileError, {
        context: {
          operation: "read admin role",
          source: "Supabase",
          table: "profiles",
        },
        prodMessage: "Impossible de verifier tes droits.",
      }),
    };
  }

  const role = (profile?.role ?? "membre") as UserRole;
  let permissions = getDefaultRolePermissions(role) as PermissionKey[];

  const { data: roleData } = await supabase
    .from("roles")
    .select("permissions")
    .eq("slug", role)
    .maybeSingle();

  if (Array.isArray(roleData?.permissions)) {
    permissions = roleData.permissions.filter(
      (permission): permission is PermissionKey => typeof permission === "string",
    ) as PermissionKey[];
  }

  if (!hasPermission({ permissions, role }, "admin.access")) {
    return { ok: false as const, message: "Accès réservé." };
  }

  return { ok: true as const, permissions, role, supabase, user };
}

function adminError(error: unknown, operation: string, table: string) {
  return formatAppError(error, {
    context: {
      operation,
      source: "Supabase",
      table,
    },
    prodMessage: "Cette action n’a pas pu être effectuée.",
  });
}

function throwAdminError(error: unknown, operation: string, table: string) {
  throw new Error(adminError(error, operation, table));
}

function requirePermission(
  auth: Extract<AdminAuth, { ok: true }>,
  permission: PermissionKey,
) {
  if (!hasPermission(auth, permission)) {
    throw new Error("Permission insuffisante.");
  }
}

async function getAdminUserIds(supabase: AdminClient) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "administrateur");

  if (error) {
    throwAdminError(error, "load excluded admin users", "profiles");
  }

  return new Set((data ?? []).map((profile) => profile.id));
}

function excludeAdminUsers<T extends { user_id?: string | null }>(
  rows: T[],
  adminUserIds: Set<string>,
) {
  return rows.filter((row) => !row.user_id || !adminUserIds.has(row.user_id));
}

function isAdminAnalyticsEvent(event: AnalyticsEventRow) {
  if (event.event_name !== "page_viewed") {
    return false;
  }

  if (
    typeof event.metadata !== "object" ||
    event.metadata === null ||
    Array.isArray(event.metadata)
  ) {
    return false;
  }

  const path = event.metadata.path;
  return typeof path === "string" && path.startsWith("/admin");
}

type AdminUserFactRelation = {
  title: string | null;
  slug: string | null;
  categories:
    | { name: string | null; slug: string | null; accent_color: string | null }
    | { name: string | null; slug: string | null; accent_color: string | null }[]
    | null;
};

type AdminUserInteractionRow = {
  created_at?: string;
  first_viewed_at?: string;
  facts: AdminUserFactRelation | AdminUserFactRelation[] | null;
};

function getAdminFactRelation(row: AdminUserInteractionRow) {
  return Array.isArray(row.facts) ? row.facts[0] : row.facts;
}

function getAdminFactCategory(fact: AdminUserFactRelation | null) {
  return Array.isArray(fact?.categories)
    ? fact.categories[0]
    : fact?.categories;
}

function formatAdminActivity(
  rows: AdminUserInteractionRow[],
  type: AdminUserActivity["type"],
): AdminUserActivity[] {
  const labels = {
    like: "A aimé",
    save: "A enregistré",
    view: "A lu",
  } satisfies Record<AdminUserActivity["type"], string>;

  return rows
    .map((row) => {
      const fact = getAdminFactRelation(row);

      if (!fact?.slug || !fact.title) {
        return null;
      }

      const category = getAdminFactCategory(fact);

      return {
        accent: category?.accent_color ?? "#fbbf24",
        at: row.first_viewed_at ?? row.created_at ?? new Date(0).toISOString(),
        factSlug: fact.slug,
        factTitle: fact.title,
        label: labels[type],
        type,
      };
    })
    .filter((item): item is AdminUserActivity => Boolean(item));
}

function getCurrentGoalStreak(
  progressRows: Pick<
    Database["public"]["Tables"]["user_daily_progress"]["Row"],
    "goal_completed" | "progress_date"
  >[],
) {
  const completedDates = new Set(
    progressRows
      .filter((row) => row.goal_completed)
      .map((row) => row.progress_date),
  );
  const cursor = new Date();
  let count = 0;
  const today = cursor.toISOString().slice(0, 10);

  if (!completedDates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let index = 0; index < 120; index += 1) {
    const key = cursor.toISOString().slice(0, 10);

    if (!completedDates.has(key)) {
      break;
    }

    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}

async function getNextFactDisplayOrder(supabase: AdminClient) {
  const { data, error } = await supabase
    .from("facts")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throwAdminError(error, "read next fact order", "facts");
  }

  return (data?.display_order ?? 0) + 10;
}

async function attachFactAuthors(
  auth: Extract<AdminAuth, { ok: true }>,
  facts: AdminFact[],
) {
  const factIds = facts.map((fact) => fact.id);

  if (factIds.length === 0) {
    return facts.map((fact) => ({ ...fact, authorProfile: null }));
  }

  const { data, error } = await auth.supabase
    .rpc("get_admin_fact_authors", { p_fact_ids: factIds });

  if (error) {
    throwAdminError(error, "load fact authors", "profiles");
  }

  const authorsByFactId = new Map(
    (data ?? []).map((author) => [author.fact_id, author]),
  );

  return facts.map((fact) => {
    const author = authorsByFactId.get(fact.id);

    return {
      ...fact,
      author_id: author?.author_id ?? null,
      authorProfile: author?.author_id
        ? {
            id: author.author_id,
            role: author.role ?? "membre",
            username: author.username ?? "Auteur inconnu",
          }
        : null,
    };
  });
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  const today = new Date().toISOString().slice(0, 10);
  const adminRole = hasPermission(auth, "users.manage");
  const adminUserIds = adminRole
    ? await getAdminUserIds(auth.supabase)
    : new Set<string>();
  const adminUserFilter =
    adminUserIds.size > 0 ? `(${[...adminUserIds].join(",")})` : null;
  let factsCountRequest = auth.supabase
    .from("facts")
    .select("id", { count: "exact", head: true });
  let pendingFactsCountRequest = auth.supabase
    .from("facts")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review");
  let pendingFactsRequest = auth.supabase
    .from("facts")
    .select(ADMIN_FACT_SELECT)
    .eq("status", "pending_review")
    .order("created_at", { ascending: false })
    .limit(6);
  let recentFactsRequest = auth.supabase
    .from("facts")
    .select(ADMIN_FACT_SELECT)
    .order("created_at", { ascending: false })
    .limit(6);
  let viewsCountRequest = auth.supabase
    .from("user_fact_views")
    .select("id", { count: "exact", head: true });
  let goalsTodayCountRequest = auth.supabase
    .from("user_daily_progress")
    .select("id", { count: "exact", head: true })
    .eq("progress_date", today)
    .eq("goal_completed", true);

  if (adminUserFilter) {
    viewsCountRequest = viewsCountRequest.not("user_id", "in", adminUserFilter);
    goalsTodayCountRequest = goalsTodayCountRequest.not(
      "user_id",
      "in",
      adminUserFilter,
    );
  }

  if (!adminRole) {
    factsCountRequest = factsCountRequest.eq("author_id", auth.user.id);
    pendingFactsCountRequest = pendingFactsCountRequest.eq(
      "author_id",
      auth.user.id,
    );
    pendingFactsRequest = pendingFactsRequest.eq("author_id", auth.user.id);
    recentFactsRequest = recentFactsRequest.eq("author_id", auth.user.id);
  }

  const [
    factsCount,
    pendingFactsCount,
    categoriesCount,
    viewsCount,
    goalsTodayCount,
    pendingFacts,
    recentFacts,
    profilesCount,
    recentProfiles,
  ] = await Promise.all([
    factsCountRequest,
    pendingFactsCountRequest,
    auth.supabase
      .from("categories")
      .select("id", { count: "exact", head: true }),
    viewsCountRequest,
    goalsTodayCountRequest,
    pendingFactsRequest,
    recentFactsRequest,
    adminRole
      ? auth.supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .neq("role", "administrateur")
      : Promise.resolve({ count: 0, error: null }),
    adminRole
      ? auth.supabase
          .from("profiles")
          .select("*")
          .neq("role", "administrateur")
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const error =
    factsCount.error ??
    pendingFactsCount.error ??
    categoriesCount.error ??
    viewsCount.error ??
    goalsTodayCount.error ??
    pendingFacts.error ??
    recentFacts.error ??
    profilesCount.error ??
    recentProfiles.error;

  if (error) {
    throwAdminError(error, "load admin dashboard", "admin");
  }

  const hydratedPendingFacts = await attachFactAuthors(
    auth,
    (pendingFacts.data ?? []) as AdminFact[],
  );
  const hydratedRecentFacts = await attachFactAuthors(
    auth,
    (recentFacts.data ?? []) as AdminFact[],
  );

  return {
    role: auth.role,
    stats: [
      { label: "Faits", value: factsCount.count ?? 0 },
      { label: "En attente", value: pendingFactsCount.count ?? 0 },
      { label: "Thèmes", value: categoriesCount.count ?? 0 },
      { label: "Vues uniques", value: viewsCount.count ?? 0 },
      { label: "Objectifs aujourd'hui", value: goalsTodayCount.count ?? 0 },
      ...(adminRole
        ? [{ label: "Utilisateurs", value: profilesCount.count ?? 0 }]
        : []),
    ],
    pendingFacts: hydratedPendingFacts,
    pendingFactsCount: pendingFactsCount.count ?? 0,
    recentFacts: hydratedRecentFacts,
    recentProfiles: (recentProfiles.data ?? []) as AdminProfile[],
  };
}

type AnalyticsSessionRow = Database["public"]["Tables"]["analytics_sessions"]["Row"];
type AnalyticsEventRow = Database["public"]["Tables"]["analytics_events"]["Row"];
type FactReadEventRow = Database["public"]["Tables"]["fact_read_events"]["Row"];
type FactStatRow = {
  id: string;
  slug: string;
  title: string;
  categories:
    | { name: string | null; slug: string | null; accent_color: string | null }
    | { name: string | null; slug: string | null; accent_color: string | null }[]
    | null;
};

function getAnalyticsIdentity(row: {
  anonymous_id: string | null;
  user_id: string | null;
}) {
  if (row.user_id) {
    return `user:${row.user_id}`;
  }

  if (row.anonymous_id) {
    return `anon:${row.anonymous_id}`;
  }

  return null;
}

function average(values: number[]) {
  const validValues = values.filter((value) => Number.isFinite(value));

  if (validValues.length === 0) {
    return 0;
  }

  return Math.round(
    validValues.reduce((total, value) => total + value, 0) / validValues.length,
  );
}

function percent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function countBy<T extends string>(values: T[]) {
  return values.reduce((map, value) => {
    map.set(value, (map.get(value) ?? 0) + 1);
    return map;
  }, new Map<T, number>());
}

function getLocalDayKey(value: string) {
  return value.slice(0, 10);
}

function getDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDashboardWindow(days = 14) {
  const currentStart = new Date();
  currentStart.setUTCHours(0, 0, 0, 0);
  currentStart.setUTCDate(currentStart.getUTCDate() - (days - 1));

  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);

  return {
    currentStart,
    days,
    previousStart,
  };
}

function buildDailySeries(
  currentCounts: Map<string, number>,
  previousCounts: Map<string, number>,
  currentStart: Date,
  days: number,
): AdminDashboardSeriesPoint[] {
  return Array.from({ length: days }, (_, index) => {
    const currentDay = new Date(currentStart);
    currentDay.setUTCDate(currentDay.getUTCDate() + index);

    const previousDay = new Date(currentDay);
    previousDay.setUTCDate(previousDay.getUTCDate() - days);

    return {
      current: currentCounts.get(getDayKey(currentDay)) ?? 0,
      label: new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      }).format(currentDay),
      previous: previousCounts.get(getDayKey(previousDay)) ?? 0,
    };
  });
}

function countRowsByDay<T>(
  rows: T[],
  getTimestamp: (row: T) => string,
  currentStart: Date,
  days: number,
) {
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  const current = new Map<string, number>();
  const previous = new Map<string, number>();

  rows.forEach((row) => {
    const timestamp = getTimestamp(row);
    const time = new Date(timestamp).getTime();
    const key = getLocalDayKey(timestamp);

    if (time >= currentStart.getTime()) {
      current.set(key, (current.get(key) ?? 0) + 1);
      return;
    }

    if (time >= previousStart.getTime()) {
      previous.set(key, (previous.get(key) ?? 0) + 1);
    }
  });

  return buildDailySeries(current, previous, currentStart, days);
}

function countVisitorsByDay(
  sessions: AnalyticsSessionRow[],
  currentStart: Date,
  days: number,
) {
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  const current = new Map<string, Set<string>>();
  const previous = new Map<string, Set<string>>();

  sessions.forEach((session) => {
    const identity = getAnalyticsIdentity(session);

    if (!identity) {
      return;
    }

    const time = new Date(session.started_at).getTime();
    const key = getLocalDayKey(session.started_at);
    const target =
      time >= currentStart.getTime()
        ? current
        : time >= previousStart.getTime()
          ? previous
          : null;

    if (!target) {
      return;
    }

    target.set(key, new Set([...(target.get(key) ?? []), identity]));
  });

  return buildDailySeries(
    new Map([...current.entries()].map(([key, values]) => [key, values.size])),
    new Map([...previous.entries()].map(([key, values]) => [key, values.size])),
    currentStart,
    days,
  );
}

function averageRowsByDay<T>(
  rows: T[],
  getTimestamp: (row: T) => string,
  getValue: (row: T) => number | null,
  currentStart: Date,
  days: number,
) {
  const previousStart = new Date(currentStart);
  previousStart.setUTCDate(previousStart.getUTCDate() - days);
  const current = new Map<string, number[]>();
  const previous = new Map<string, number[]>();

  rows.forEach((row) => {
    const value = getValue(row);

    if (value === null || !Number.isFinite(value)) {
      return;
    }

    const timestamp = getTimestamp(row);
    const time = new Date(timestamp).getTime();
    const key = getLocalDayKey(timestamp);
    const target =
      time >= currentStart.getTime()
        ? current
        : time >= previousStart.getTime()
          ? previous
          : null;

    if (!target) {
      return;
    }

    target.set(key, [...(target.get(key) ?? []), value]);
  });

  return buildDailySeries(
    new Map([...current.entries()].map(([key, values]) => [key, average(values)])),
    new Map([...previous.entries()].map(([key, values]) => [key, average(values)])),
    currentStart,
    days,
  );
}

function getMetricComparison(current: number, previous: number) {
  return { current, previous } satisfies AdminAnalyticsMetric;
}

function getRowsOnDay<T>(
  rows: T[],
  getTimestamp: (row: T) => string,
  dayKey: string,
) {
  return rows.filter((row) => getLocalDayKey(getTimestamp(row)) === dayKey);
}

function countVisitorsOnDay(sessions: AnalyticsSessionRow[], dayKey: string) {
  return new Set(
    getRowsOnDay(sessions, (session) => session.started_at, dayKey)
      .map(getAnalyticsIdentity)
      .filter((identity): identity is string => Boolean(identity)),
  ).size;
}

function getDayOffset(startDay: string, nextDay: string) {
  const start = new Date(`${startDay}T00:00:00.000Z`).getTime();
  const next = new Date(`${nextDay}T00:00:00.000Z`).getTime();

  return Math.round((next - start) / (24 * 60 * 60 * 1000));
}

function getReturnRate(sessions: AnalyticsSessionRow[], daysAfterFirstSession: number) {
  const today = getDayKey(new Date());
  const sessionsByIdentity = new Map<string, Set<string>>();

  sessions.forEach((session) => {
    const identity = getAnalyticsIdentity(session);

    if (!identity) {
      return;
    }

    sessionsByIdentity.set(identity, new Set([
      ...(sessionsByIdentity.get(identity) ?? []),
      getLocalDayKey(session.started_at),
    ]));
  });

  let eligible = 0;
  let returned = 0;

  sessionsByIdentity.forEach((days) => {
    const sortedDays = [...days].sort();
    const firstDay = sortedDays[0];

    if (!firstDay || getDayOffset(firstDay, today) < daysAfterFirstSession) {
      return;
    }

    eligible += 1;

    if (sortedDays.some((day) => getDayOffset(firstDay, day) === daysAfterFirstSession)) {
      returned += 1;
    }
  });

  return eligible > 0 ? percent(returned, eligible) : null;
}

function getFactCategory(fact?: FactStatRow | null) {
  const category = Array.isArray(fact?.categories)
    ? fact.categories[0]
    : fact?.categories;

  if (!category?.slug || !category.name) {
    return null;
  }

  return {
    accent: category.accent_color ?? "#fbbf24",
    name: category.name,
    slug: category.slug,
  };
}

function toFactStats(
  counts: Map<string, number>,
  factsById: Map<string, FactStatRow>,
  limit = 10,
): AdminAnalyticsFactStat[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, value]) => {
      const fact = factsById.get(id);

      return {
        id,
        slug: fact?.slug ?? id,
    title: fact?.title ?? "Fait supprimé ou indisponible",
        value,
      };
    });
}

function toThemeStats(
  counts: Map<string, AdminAnalyticsThemeStat>,
  limit = 10,
) {
  return [...counts.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

function getSearchMetadata(event: AnalyticsEventRow) {
  if (
    typeof event.metadata !== "object" ||
    event.metadata === null ||
    Array.isArray(event.metadata)
  ) {
    return null;
  }

  const term =
    typeof event.metadata.term === "string"
      ? event.metadata.term
      : typeof event.metadata.query === "string"
        ? event.metadata.query
        : null;

  if (!term?.trim()) {
    return null;
  }

  return {
    noResult: event.metadata.no_result === true,
    term: term.trim(),
  };
}

function toSearchStats(events: AnalyticsEventRow[], limit = 5) {
  const counts = new Map<string, AdminAnalyticsSearchStat>();

  events.forEach((event) => {
    const metadata = getSearchMetadata(event);

    if (!metadata) {
      return;
    }

    const id = metadata.term.toLocaleLowerCase("fr-FR");
    const current = counts.get(id);

    counts.set(id, {
      id,
      noResultCount: (current?.noResultCount ?? 0) + (metadata.noResult ? 1 : 0),
      term: current?.term ?? metadata.term,
      value: (current?.value ?? 0) + 1,
    });
  });

  return [...counts.values()].sort((a, b) => b.value - a.value).slice(0, limit);
}

export async function getAdminAnalyticsData(): Promise<AdminAnalyticsData> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  if (auth.role !== "administrateur") {
    throw new Error("Accès réservé aux administrateurs.");
  }

  const dashboardWindow = getDashboardWindow();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const progressSince = getDayKey(dashboardWindow.previousStart);
  const adminUserIds = await getAdminUserIds(auth.supabase);
  const [sessionsResult, eventsResult, readsResult, savesResult, profilesResult, progressResult] =
    await Promise.all([
      auth.supabase
        .from("analytics_sessions")
        .select("*")
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(5000),
      auth.supabase
        .from("analytics_events")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(6000),
      auth.supabase
        .from("fact_read_events")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(6000),
      auth.supabase
        .from("saves")
        .select("fact_id,created_at,user_id")
        .gte("created_at", since)
        .limit(6000),
      auth.supabase
        .from("profiles")
        .select("id,created_at,role")
        .gte("created_at", dashboardWindow.previousStart.toISOString())
        .neq("role", "administrateur")
        .limit(6000),
      auth.supabase
        .from("user_daily_progress")
        .select("user_id,progress_date,facts_read_count,goal_completed")
        .gte("progress_date", progressSince)
        .limit(6000),
    ]);

  const error =
    sessionsResult.error ??
    eventsResult.error ??
    readsResult.error ??
    savesResult.error ??
    profilesResult.error ??
    progressResult.error;

  if (error) {
    throwAdminError(error, "load admin analytics", "analytics");
  }

  const sessions = excludeAdminUsers(
    (sessionsResult.data ?? []) as AnalyticsSessionRow[],
    adminUserIds,
  );
  const events = excludeAdminUsers(
    (eventsResult.data ?? []) as AnalyticsEventRow[],
    adminUserIds,
  ).filter((event) => !isAdminAnalyticsEvent(event));
  const reads = excludeAdminUsers(
    (readsResult.data ?? []) as FactReadEventRow[],
    adminUserIds,
  );
  const saves = excludeAdminUsers(
    (savesResult.data ?? []) as {
      created_at: string;
      fact_id: string;
      user_id: string | null;
    }[],
    adminUserIds,
  );
  const progressRows = excludeAdminUsers(
    (progressResult.data ?? []) as Pick<
      Database["public"]["Tables"]["user_daily_progress"]["Row"],
      "facts_read_count" | "goal_completed" | "progress_date" | "user_id"
    >[],
    adminUserIds,
  );
  const registrations = (profilesResult.data ?? []) as {
    created_at: string;
    id: string;
  }[];
  const factIds = [
    ...new Set([
      ...reads.map((row) => row.fact_id),
      ...saves.map((row) => row.fact_id),
    ]),
  ];
  const factsResult =
    factIds.length > 0
      ? await auth.supabase
          .from("facts")
          .select("id,slug,title,categories(name,slug,accent_color)")
          .in("id", factIds)
      : { data: [], error: null };

  if (factsResult.error) {
    throwAdminError(factsResult.error, "load analytics facts", "facts");
  }

  const factsById = new Map(
    ((factsResult.data ?? []) as FactStatRow[]).map((fact) => [fact.id, fact]),
  );
  const publicReads = reads.filter(
    (read) =>
      !isCommercialCollaborationSlug(
        getFactCategory(factsById.get(read.fact_id))?.slug,
      ),
  );
  const publicSaves = saves.filter(
    (save) =>
      !isCommercialCollaborationSlug(
        getFactCategory(factsById.get(save.fact_id))?.slug,
      ),
  );
  const readCounts = countBy(publicReads.map((row) => row.fact_id));
  const saveCounts = countBy(publicSaves.map((row) => row.fact_id));
  const readThemes = new Map<string, AdminAnalyticsThemeStat>();

  publicReads.forEach((read) => {
    const category = getFactCategory(factsById.get(read.fact_id));

    if (!category) {
      return;
    }

    const current = readThemes.get(category.slug);
    readThemes.set(category.slug, {
      ...category,
      value: (current?.value ?? 0) + 1,
    });
  });
  const searchEvents = events.filter((event) =>
    ["explorer_search", "search_used"].includes(event.event_name),
  );
  const today = getDayKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = getDayKey(yesterdayDate);
  const todayReads = getRowsOnDay(publicReads, (read) => read.created_at, today);
  const yesterdayReads = getRowsOnDay(
    publicReads,
    (read) => read.created_at,
    yesterday,
  );
  const todayGoals = progressRows.filter(
    (row) => row.progress_date === today && row.goal_completed,
  );
  const yesterdayGoals = progressRows.filter(
    (row) => row.progress_date === yesterday && row.goal_completed,
  );
  const rowsWithReadProgress = progressRows.filter(
    (row) => row.facts_read_count > 0,
  );
  const currentSessions = sessions.filter(
    (session) =>
      new Date(session.started_at).getTime() >= dashboardWindow.currentStart.getTime(),
  );

  return {
    overview: {
      activeUsersToday: getMetricComparison(
        countVisitorsOnDay(sessions, today),
        countVisitorsOnDay(sessions, yesterday),
      ),
      averageReadSecondsToday: getMetricComparison(
        average(
          todayReads
            .map((read) => read.duration_seconds ?? 0)
            .filter((duration) => duration > 0),
        ),
        average(
          yesterdayReads
            .map((read) => read.duration_seconds ?? 0)
            .filter((duration) => duration > 0),
        ),
      ),
      factsReadToday: getMetricComparison(todayReads.length, yesterdayReads.length),
      goalsCompletedToday: getMetricComparison(
        todayGoals.length,
        yesterdayGoals.length,
      ),
    },
    series: {
      activeUsers: countVisitorsByDay(
        sessions,
        dashboardWindow.currentStart,
        dashboardWindow.days,
      ),
      averageSwipeSeconds: averageRowsByDay(
        publicReads,
        (read) => read.created_at,
        (read) => read.duration_seconds,
        dashboardWindow.currentStart,
        dashboardWindow.days,
      ),
      factReads: countRowsByDay(
        publicReads,
        (read) => read.created_at,
        dashboardWindow.currentStart,
        dashboardWindow.days,
      ),
      registrations: countRowsByDay(
        registrations,
        (profile) => profile.created_at,
        dashboardWindow.currentStart,
        dashboardWindow.days,
      ),
    },
    topContent: {
      explorerSearches: toSearchStats(searchEvents),
      readFacts: toFactStats(readCounts, factsById, 5),
      readThemes: toThemeStats(readThemes, 5),
      savedFacts: toFactStats(saveCounts, factsById, 5),
    },
    health: {
      averageFactsPerUserDay:
        rowsWithReadProgress.length > 0
          ? Number(
              (
                rowsWithReadProgress.reduce(
                  (total, row) => total + row.facts_read_count,
                  0,
                ) / rowsWithReadProgress.length
              ).toFixed(1),
            )
          : null,
      averageSessionsPerDay:
        currentSessions.length > 0
          ? Number((currentSessions.length / dashboardWindow.days).toFixed(1))
          : null,
      d1ReturnRate: getReturnRate(sessions, 1),
      d7ReturnRate: getReturnRate(sessions, 7),
    },
  };
}

export async function getAdminFeedDebugRows(): Promise<AdminFeedDebugRow[]> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requirePermission(auth, "admin.access");

  const { data, error } = await auth.supabase.rpc("get_personalized_feed", {
    p_debug: true,
    p_limit: 5,
    p_session_id: null,
    p_theme_slug: null,
    p_user_id: auth.user.id,
  });

  if (error) {
    throwAdminError(error, "load feed score debug", "get_personalized_feed");
  }

  return ((data ?? []) as {
    category_name: string;
    id: string;
    recommendation_score: number;
    score_debug: Record<string, unknown> | null;
    title: string;
  }[]).map((row) => ({
    categoryName: row.category_name,
    id: row.id,
    score: row.recommendation_score,
    scoreDebug: row.score_debug ?? {},
    title: row.title,
  }));
}

export async function getAdminCategories({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
}: {
  page?: number;
  pageSize?: number;
  query?: string;
} = {}): Promise<AdminListResult<AdminCategory>> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  const { from, page: safePage, pageSize: safePageSize, to } = getRange(
    page,
    pageSize,
  );
  const searchTerm = normalizeSearchTerm(query);
  let request = auth.supabase
    .from("categories")
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range(from, to);

  if (searchTerm) {
    request = request.or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
  }

  const { data, count, error } = await request;

  if (error) {
    throwAdminError(error, "load admin themes", "categories");
  }

  return {
    items: (data ?? []) as AdminCategory[],
    page: safePage,
    pageSize: safePageSize,
    total: count ?? 0,
  };
}

export async function getAdminQuizQuestions({
  active,
  difficulty,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
}: {
  active?: "active" | "all" | "inactive";
  difficulty?: QuizDifficulty | "all";
  page?: number;
  pageSize?: number;
  query?: string;
} = {}): Promise<AdminListResult<AdminQuizQuestion>> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requirePermission(auth, "quizzes.manage");

  const { from, page: safePage, pageSize: safePageSize, to } = getRange(
    page,
    pageSize,
  );
  const searchTerm = normalizeSearchTerm(query);
  let request = auth.supabase
    .from("quiz_questions")
    .select(ADMIN_QUIZ_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchTerm) {
    request = request.or(
      `question.ilike.%${searchTerm}%,correct_answer.ilike.%${searchTerm}%`,
    );
  }

  if (active === "active") {
    request = request.eq("is_active", true);
  }

  if (active === "inactive") {
    request = request.eq("is_active", false);
  }

  if (difficulty && difficulty !== "all") {
    request = request.eq("difficulty", difficulty);
  }

  const { data, count, error } = await request;

  if (error) {
    throwAdminError(error, "load admin quiz questions", "quiz_questions");
  }

  return {
    items: (data ?? []) as AdminQuizQuestion[],
    page: safePage,
    pageSize: safePageSize,
    total: count ?? 0,
  };
}

export async function getAdminFacts({
  authorId,
  categoryId,
  difficultyLevel,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  status,
}: {
  authorId?: string;
  categoryId?: string;
  difficultyLevel?: DifficultyLevel | "all";
  page?: number;
  pageSize?: number;
  query?: string;
  status?: FactStatus | "all";
} = {}): Promise<
  AdminListResult<AdminFact> & { categories: AdminCategory[]; role: UserRole }
> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  const { from, page: safePage, pageSize: safePageSize, to } = getRange(
    page,
    pageSize,
  );
  const searchTerm = normalizeSearchTerm(query);
  let factsRequest = auth.supabase
    .from("facts")
    .select(ADMIN_FACT_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchTerm) {
    factsRequest = factsRequest.or(
      `title.ilike.%${searchTerm}%,hook.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,long_content.ilike.%${searchTerm}%,source.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`,
    );
  }

  if (status && status !== "all") {
    factsRequest = factsRequest.eq("status", status);
  }

  if (categoryId && categoryId !== "all") {
    factsRequest = factsRequest.eq("category_id", categoryId);
  }

  if (difficultyLevel && difficultyLevel !== "all") {
    factsRequest = factsRequest.eq(
      "difficulty_level",
      normalizeDifficultyLevel(difficultyLevel),
    );
  }

  if (authorId && authorId !== "all" && hasPermission(auth, "facts.manage")) {
    factsRequest = factsRequest.eq("author_id", authorId);
  }

  if (!hasPermission(auth, "facts.manage")) {
    factsRequest = factsRequest.eq("author_id", auth.user.id);
  }

  const [factsResult, categoriesResult] = await Promise.all([
    factsRequest,
    auth.supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true }),
  ]);

  const error = factsResult.error ?? categoriesResult.error;

  if (error) {
    throwAdminError(error, "load admin facts", "facts");
  }

  const facts = await attachFactAuthors(
    auth,
    (factsResult.data ?? []) as AdminFact[],
  );

  return {
    categories: (categoriesResult.data ?? []) as AdminCategory[],
    items: facts,
    page: safePage,
    pageSize: safePageSize,
    role: auth.role,
    total: factsResult.count ?? 0,
  };
}

export async function getAdminProfiles({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  role,
}: {
  page?: number;
  pageSize?: number;
  query?: string;
  role?: string;
} = {}): Promise<AdminListResult<AdminProfile>> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requirePermission(auth, "users.manage");

  const { from, page: safePage, pageSize: safePageSize } = getRange(
    page,
    pageSize,
  );
  const searchTerm = normalizeSearchTerm(query);
  const { data, error } = await auth.supabase.rpc("get_admin_profiles", {
    p_limit: safePageSize,
    p_offset: from,
    p_query: searchTerm || null,
    p_role: role && role !== "all" ? role : null,
  });

  if (error) {
    throwAdminError(error, "load admin profiles", "profiles");
  }

  const rows = (data ?? []) as (AdminProfile & { total_count?: number })[];

  return {
    items: rows.map((row) => ({
      avatar_url: row.avatar_url,
      created_at: row.created_at,
      daily_goal: row.daily_goal,
      email: row.email,
      id: row.id,
      learning_goal: row.learning_goal,
      role: row.role,
      updated_at: row.updated_at,
      username: row.username,
    })),
    page: safePage,
    pageSize: safePageSize,
    total: Number(rows[0]?.total_count ?? 0),
  };
}

export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requirePermission(auth, "users.manage");

  const profileList = await getAdminProfiles({
    pageSize: 10,
    query: userId,
  });
  let profile = profileList.items.find((item) => item.id === userId) ?? null;

  if (!profile) {
    const { data, error } = await auth.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throwAdminError(error, "load admin user profile", "profiles");
    }

    profile = data ? ({ ...data, email: null } as AdminProfile) : null;
  }

  if (!profile) {
    return null;
  }

  const [
    roleResult,
    viewedFacts,
    likedFacts,
    savedFacts,
    completedGoals,
    progressRows,
    gradesResult,
    themeRows,
    recentViews,
    recentLikes,
    recentSaves,
  ] = await Promise.all([
    auth.supabase
      .from("roles")
      .select("name")
      .eq("slug", profile.role)
      .maybeSingle(),
    auth.supabase
      .from("user_fact_views")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    auth.supabase
      .from("likes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    auth.supabase
      .from("saves")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    auth.supabase
      .from("user_daily_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("goal_completed", true),
    auth.supabase
      .from("user_daily_progress")
      .select("progress_date,goal_completed")
      .eq("user_id", userId)
      .order("progress_date", { ascending: false })
      .limit(120),
    auth.supabase
      .from("grades")
      .select("id,slug,name,required_goals,description,badge,display_order")
      .order("required_goals", { ascending: true })
      .order("display_order", { ascending: true }),
    auth.supabase
      .from("user_fact_views")
      .select("first_viewed_at,facts(title,slug,categories(name,slug,accent_color))")
      .eq("user_id", userId)
      .order("first_viewed_at", { ascending: false })
      .limit(250),
    auth.supabase
      .from("user_fact_views")
      .select("first_viewed_at,facts(title,slug,categories(name,slug,accent_color))")
      .eq("user_id", userId)
      .order("first_viewed_at", { ascending: false })
      .limit(6),
    auth.supabase
      .from("likes")
      .select("created_at,facts(title,slug,categories(name,slug,accent_color))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
    auth.supabase
      .from("saves")
      .select("created_at,facts(title,slug,categories(name,slug,accent_color))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const error =
    roleResult.error ??
    viewedFacts.error ??
    likedFacts.error ??
    savedFacts.error ??
    completedGoals.error ??
    progressRows.error ??
    gradesResult.error ??
    themeRows.error ??
    recentViews.error ??
    recentLikes.error ??
    recentSaves.error;

  if (error) {
    throwAdminError(error, "load admin user detail", "users");
  }

  const grades = (gradesResult.data ?? []).map((grade) => ({
    badge: grade.badge,
    description: grade.description,
    displayOrder: grade.display_order,
    id: grade.id,
    name: grade.name,
    requiredGoals: grade.required_goals,
    slug: grade.slug,
  }));
  const completedGoalsCount = completedGoals.count ?? 0;
  const grade = getBadgeInfo(completedGoalsCount, grades);
  const themeStats = new Map<string, AdminUserThemeStat>();

  ((themeRows.data ?? []) as AdminUserInteractionRow[]).forEach((row) => {
    const category = getAdminFactCategory(getAdminFactRelation(row));

    if (!category?.slug || !category.name) {
      return;
    }

    const current = themeStats.get(category.slug);
    themeStats.set(category.slug, {
      accent: category.accent_color ?? "#fbbf24",
      count: (current?.count ?? 0) + 1,
      name: category.name,
      slug: category.slug,
    });
  });

  const recentActivity = [
    ...formatAdminActivity(
      (recentViews.data ?? []) as AdminUserInteractionRow[],
      "view",
    ),
    ...formatAdminActivity(
      (recentLikes.data ?? []) as AdminUserInteractionRow[],
      "like",
    ),
    ...formatAdminActivity(
      (recentSaves.data ?? []) as AdminUserInteractionRow[],
      "save",
    ),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 10);

  return {
    gradeBadge: grade.badge,
    gradeName: grade.title,
    profile,
    recentActivity,
    roleName: roleResult.data?.name ?? null,
    stats: {
      completedGoals: completedGoalsCount,
      currentStreak: getCurrentGoalStreak(progressRows.data ?? []),
      interactions:
        (viewedFacts.count ?? 0) + (likedFacts.count ?? 0) + (savedFacts.count ?? 0),
      likedFacts: likedFacts.count ?? 0,
      savedFacts: savedFacts.count ?? 0,
      viewedFacts: viewedFacts.count ?? 0,
    },
    topThemes: [...themeStats.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}

export async function getAdminCategory(id: string): Promise<AdminCategory | null> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requirePermission(auth, "themes.manage");

  const { data, error } = await auth.supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throwAdminError(error, "load admin theme", "categories");
  }

  return data as AdminCategory | null;
}

export async function getAdminFact(id: string): Promise<
  { categories: AdminCategory[]; fact: AdminFact | null; role: UserRole }
> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  const [factResult, categoriesResult, quizResult] = await Promise.all([
    auth.supabase
      .from("facts")
      .select(ADMIN_FACT_SELECT)
      .eq("id", id)
      .maybeSingle(),
    auth.supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true }),
    auth.supabase
      .from("quiz_questions")
      .select("id,question,is_active")
      .eq("fact_id", id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const error = factResult.error ?? categoriesResult.error ?? quizResult.error;

  if (error) {
    throwAdminError(error, "load admin fact", "facts");
  }

  const hydrated = factResult.data
    ? (await attachFactAuthors(auth, [factResult.data as AdminFact]))[0]
    : null;
  const relatedFacts = await getAdminFactRelations(auth, id);
  const fact = hydrated
    ? {
        ...hydrated,
        relatedFacts,
        quizQuestion: quizResult.data
          ? {
              id: quizResult.data.id,
              is_active: quizResult.data.is_active,
              question: quizResult.data.question,
            }
          : null,
      }
    : null;

  return {
    categories: (categoriesResult.data ?? []) as AdminCategory[],
    fact,
    role: auth.role,
  };
}

async function getAdminFactRelations(
  auth: Extract<AdminAuth, { ok: true }>,
  factId: string,
): Promise<AdminRelatedFact[]> {
  try {
    const { data, error } = await auth.supabase
      .from("fact_relations")
      .select("id,position,related_fact_id")
      .eq("source_fact_id", factId)
      .order("position", { ascending: true })
      .limit(10);

    if (error || !data?.length) {
      return [];
    }

    const relationRows = data as {
      id: string;
      position: number;
      related_fact_id: string;
    }[];
    const factIds = relationRows.map((row) => row.related_fact_id);
    const { data: facts } = await auth.supabase
      .from("facts")
      .select("id,slug,title,categories(name)")
      .in("id", factIds);
    const factsById = new Map(
      ((facts ?? []) as {
        categories: { name: string } | { name: string }[] | null;
        id: string;
        slug: string;
        title: string;
      }[]).map((fact) => [fact.id, fact]),
    );

    return relationRows
      .map((relation) => {
        const fact = factsById.get(relation.related_fact_id);
        const category = Array.isArray(fact?.categories)
          ? fact?.categories[0]
          : fact?.categories;

        return fact
          ? {
              categoryName: category?.name ?? null,
              id: fact.id,
              position: relation.position,
              relationId: relation.id,
              slug: fact.slug,
              title: fact.title,
            }
          : null;
      })
      .filter((fact): fact is AdminRelatedFact => fact !== null);
  } catch {
    return [];
  }
}

export async function addAdminFactRelation({
  relatedFactId,
  sourceFactId,
}: {
  relatedFactId: string;
  sourceFactId: string;
}): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "facts.create")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  if (sourceFactId === relatedFactId) {
    return { ok: false, message: "Un fait ne peut pas être lié à lui-même." };
  }

  const { count } = await auth.supabase
    .from("fact_relations")
    .select("id", { count: "exact", head: true })
    .eq("source_fact_id", sourceFactId);
  const { error } = await auth.supabase.from("fact_relations").insert({
    position: count ?? 0,
    related_fact_id: relatedFactId,
    source_fact_id: sourceFactId,
  });

  if (error) {
    return {
      ok: false,
      message: adminError(error, "create fact relation", "fact_relations"),
    };
  }

  return { ok: true, message: "Fait associé ajouté." };
}

export async function deleteAdminFactRelation(
  relationId: string,
): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "facts.create")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const { error } = await auth.supabase
    .from("fact_relations")
    .delete()
    .eq("id", relationId);

  if (error) {
    return {
      ok: false,
      message: adminError(error, "delete fact relation", "fact_relations"),
    };
  }

  return { ok: true, message: "Fait associé retiré." };
}

export async function searchAdminFactOptions(query: string): Promise<
  {
    categoryName: string | null;
    id: string;
    title: string;
  }[]
> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requirePermission(auth, "quizzes.manage");

  const searchTerm = normalizeSearchTerm(query);

  if (searchTerm.length < 2) {
    return [];
  }

  const { data, error } = await auth.supabase
    .from("facts")
    .select("id,title,categories(name)")
    .or(`title.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(12);

  if (error) {
    throwAdminError(error, "search quiz facts", "facts");
  }

  return ((data ?? []) as {
    categories: { name: string } | { name: string }[] | null;
    id: string;
    title: string;
  }[]).map((fact) => {
    const category = Array.isArray(fact.categories)
      ? fact.categories[0]
      : fact.categories;

    return {
      categoryName: category?.name ?? null,
      id: fact.id,
      title: fact.title,
    };
  });
}

export async function getAdminQuizQuestion(
  id: string,
): Promise<AdminQuizQuestion | null> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requirePermission(auth, "quizzes.manage");

  const { data, error } = await auth.supabase
    .from("quiz_questions")
    .select(ADMIN_QUIZ_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throwAdminError(error, "load admin quiz question", "quiz_questions");
  }

  return data as AdminQuizQuestion | null;
}

export async function getAdminRoles({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  system,
}: {
  page?: number;
  pageSize?: number;
  query?: string;
  system?: "all" | "custom" | "system";
} = {}): Promise<AdminListResult<AdminRole>> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requirePermission(auth, "roles.manage");

  const { from, page: safePage, pageSize: safePageSize, to } = getRange(
    page,
    pageSize,
  );
  const searchTerm = normalizeSearchTerm(query);
  let request = auth.supabase
    .from("roles")
    .select("*", { count: "exact" })
    .order("is_system", { ascending: false })
    .order("created_at", { ascending: true })
    .range(from, to);

  if (searchTerm) {
    request = request.or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
  }

  if (system === "custom") {
    request = request.eq("is_system", false);
  }

  if (system === "system") {
    request = request.eq("is_system", true);
  }

  const { data, count, error } = await request;

  if (error) {
    throwAdminError(error, "load admin roles", "roles");
  }

  return {
    items: (data ?? []) as AdminRole[],
    page: safePage,
    pageSize: safePageSize,
    total: count ?? 0,
  };
}

export async function getAllAdminRoles(): Promise<AdminRole[]> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requirePermission(auth, "users.manage");

  const { data, error } = await auth.supabase
    .from("roles")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throwAdminError(error, "load role options", "roles");
  }

  return (data ?? []) as AdminRole[];
}

export async function getAdminRole(slug: string): Promise<AdminRole | null> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requirePermission(auth, "roles.manage");

  const { data, error } = await auth.supabase
    .from("roles")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throwAdminError(error, "load admin role", "roles");
  }

  return data as AdminRole | null;
}

export async function getAdminGrades({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  system,
}: {
  page?: number;
  pageSize?: number;
  query?: string;
  system?: "all" | "custom" | "system";
} = {}): Promise<AdminListResult<AdminGrade>> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requirePermission(auth, "grades.manage");

  const { from, page: safePage, pageSize: safePageSize, to } = getRange(
    page,
    pageSize,
  );
  const searchTerm = normalizeSearchTerm(query);
  let request = auth.supabase
    .from("grades")
    .select("*", { count: "exact" })
    .order("required_goals", { ascending: true })
    .order("display_order", { ascending: true })
    .range(from, to);

  if (searchTerm) {
    request = request.or(`name.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`);
  }

  if (system === "custom") {
    request = request.eq("is_system", false);
  }

  if (system === "system") {
    request = request.eq("is_system", true);
  }

  const { data, count, error } = await request;

  if (error) {
    throwAdminError(error, "load admin grades", "grades");
  }

  return {
    items: (data ?? []) as AdminGrade[],
    page: safePage,
    pageSize: safePageSize,
    total: count ?? 0,
  };
}

export async function getAdminGrade(id: string): Promise<AdminGrade | null> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requirePermission(auth, "grades.manage");

  const { data, error } = await auth.supabase
    .from("grades")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throwAdminError(error, "load admin grade", "grades");
  }

  return data as AdminGrade | null;
}

export async function saveAdminCategory(input: {
  accent_color: string;
  description_courte?: string | null;
  description_longue?: string | null;
  gradient_end?: string | null;
  gradient_middle?: string | null;
  gradient_start?: string | null;
  id?: string;
  keywords?: string[] | null;
  name: string;
  seo_description?: string | null;
  seo_title?: string | null;
  theme_image_url?: string | null;
  tone: string;
  visual_motif?: string | null;
}): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "themes.manage")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const name = input.name.trim();

  if (!name) {
    return { ok: false, message: "Le nom du thème est requis." };
  }

  const baseSlug = slugify(name);
  const { data: existingSlugs } = await auth.supabase
    .from("categories")
    .select("id,slug")
    .ilike("slug", `${baseSlug}%`);
  const usedSlugs = new Set(
    ((existingSlugs ?? []) as Pick<AdminCategory, "id" | "slug">[])
      .filter((category) => category.id !== input.id)
      .map((category) => category.slug),
  );
  let slug = baseSlug;
  let suffix = 2;

  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const payload = {
    accent_color: input.accent_color || "#ffd166",
    description_courte: input.description_courte?.trim() || null,
    description_longue: input.description_longue?.trim() || null,
    gradient_end: input.gradient_end?.trim() || null,
    gradient_middle: input.gradient_middle?.trim() || null,
    gradient_start: input.gradient_start?.trim() || null,
    keywords: input.keywords?.map((keyword) => keyword.trim()).filter(Boolean) ?? null,
    name,
    seo_description: input.seo_description?.trim() || null,
    seo_title: input.seo_title?.trim() || null,
    slug,
    theme_image_url: input.theme_image_url?.trim() || null,
    tone:
      input.tone?.trim() ||
      `linear-gradient(135deg, ${input.gradient_start || "#0b1424"}, ${input.gradient_middle || "#132744"}, ${input.gradient_end || "#f0a95a"})`,
    visual_motif: input.visual_motif || null,
  };

  const result = input.id
    ? await auth.supabase.from("categories").update(payload).eq("id", input.id)
    : await auth.supabase.from("categories").insert(payload);

  if (result.error) {
    return {
      ok: false,
      message: adminError(result.error, "save category", "categories"),
    };
  }

  return { ok: true, message: "Thème enregistré." };
}

export async function deleteAdminCategory(
  id: string,
): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "themes.manage")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const { error } = await auth.supabase.from("categories").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: adminError(error, "delete category", "categories"),
    };
  }

  return { ok: true, message: "Thème supprimé." };
}

export async function saveAdminQuizQuestion(input: {
  correct_answer: string;
  difficulty?: QuizDifficulty | string;
  fact_id?: string | null;
  id?: string;
  is_active: boolean;
  question: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
}): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "quizzes.manage")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const payload = {
    correct_answer: input.correct_answer.trim(),
    difficulty: normalizeQuizDifficulty(input.difficulty),
    fact_id: input.fact_id || null,
    is_active: input.is_active,
    question: input.question.trim(),
    wrong_answer_1: input.wrong_answer_1.trim(),
    wrong_answer_2: input.wrong_answer_2.trim(),
    wrong_answer_3: input.wrong_answer_3.trim(),
  };

  if (
    !payload.question ||
    !payload.correct_answer ||
    !payload.wrong_answer_1 ||
    !payload.wrong_answer_2 ||
    !payload.wrong_answer_3
  ) {
    return {
      ok: false,
      message: "Les quatre réponses et la question sont requises.",
    };
  }

  const result = input.id
    ? await auth.supabase.from("quiz_questions").update(payload).eq("id", input.id)
    : await auth.supabase.from("quiz_questions").insert(payload);

  if (result.error) {
    return {
      ok: false,
      message: adminError(result.error, "save quiz question", "quiz_questions"),
    };
  }

  return { ok: true, message: "Question quiz enregistrée." };
}

export async function deleteAdminQuizQuestion(
  id: string,
): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "quizzes.manage")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const { error } = await auth.supabase
    .from("quiz_questions")
    .delete()
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      message: adminError(error, "delete quiz question", "quiz_questions"),
    };
  }

  return { ok: true, message: "Question quiz supprimée." };
}

export async function saveAdminFact(input: {
  category_id: string;
  content: string;
  difficulty_level?: DifficultyLevel;
  event_day?: number | null;
  event_month?: number | null;
  event_year?: number | null;
  hook?: string | null;
  id?: string;
  long_content?: string | null;
  quiz?: {
    correct_answer: string;
    difficulty?: QuizDifficulty | string;
    question: string;
    wrong_answer_1: string;
    wrong_answer_2: string;
    wrong_answer_3: string;
  } | null;
  seo_description?: string | null;
  seo_title?: string | null;
  source?: string | null;
  source_url?: string | null;
  status?: FactStatus;
  title: string;
}): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const title = input.title.trim();
  const hook = input.hook?.trim() ?? "";
  const seoTitle = input.seo_title?.trim() || null;
  const seoDescription = input.seo_description?.trim() || null;

  if (!input.category_id || !title || !input.content.trim()) {
    return {
      ok: false,
      message: "Titre, contexte et thème sont requis.",
    };
  }

  if (seoTitle && seoTitle.length > 90) {
    return { ok: false, message: "Le titre SEO doit rester sous 90 caractères." };
  }

  if (seoDescription && seoDescription.length > 220) {
    return {
      ok: false,
      message: "La description SEO doit rester sous 220 caractères.",
    };
  }

  if (
    (input.event_day && (!input.event_month || input.event_day < 1 || input.event_day > 31)) ||
    (input.event_month && (input.event_month < 1 || input.event_month > 12))
  ) {
    return {
      ok: false,
      message: "La date éditoriale doit contenir un jour et un mois valides.",
    };
  }

  try {
    const canPublish = hasPermission(auth, "facts.publish");
    const status = canPublish ? input.status ?? "published" : "pending_review";
    const quiz = input.quiz
      ? {
          correct_answer: input.quiz.correct_answer.trim(),
          difficulty: normalizeQuizDifficulty(input.quiz.difficulty),
          question: input.quiz.question.trim(),
          wrong_answer_1: input.quiz.wrong_answer_1.trim(),
          wrong_answer_2: input.quiz.wrong_answer_2.trim(),
          wrong_answer_3: input.quiz.wrong_answer_3.trim(),
        }
      : null;
    const hasQuizInput =
      Boolean(quiz?.question) ||
      Boolean(quiz?.correct_answer) ||
      Boolean(quiz?.wrong_answer_1) ||
      Boolean(quiz?.wrong_answer_2) ||
      Boolean(quiz?.wrong_answer_3);

    if (
      hasQuizInput &&
      (!quiz?.question ||
        !quiz.correct_answer ||
        !quiz.wrong_answer_1 ||
        !quiz.wrong_answer_2 ||
        !quiz.wrong_answer_3)
    ) {
      return {
        ok: false,
        message:
          "Complète la question quiz et les quatre réponses, ou laisse toute la section vide.",
      };
    }

    const basePayload = {
      category_id: input.category_id,
      content: input.content.trim(),
      difficulty_level: normalizeDifficultyLevel(input.difficulty_level),
      event_day: input.event_day || null,
      event_month: input.event_month || null,
      event_year: input.event_year || null,
      hook: hook || null,
      long_content: input.long_content?.trim() || null,
      published_at: status === "published" ? new Date().toISOString() : null,
      seo_description: seoDescription,
      seo_title: seoTitle,
      source: input.source?.trim() || null,
      source_url: input.source_url?.trim() || null,
      status,
      title,
    };

    const result = input.id
      ? await auth.supabase
          .from("facts")
          .update(basePayload)
          .eq("id", input.id)
          .select("id")
          .single()
      : await auth.supabase
          .from("facts")
          .insert({
            ...basePayload,
            author_id: auth.user.id,
            display_order: await getNextFactDisplayOrder(auth.supabase),
          })
          .select("id")
          .single();

    if (result.error) {
      return {
        ok: false,
        message: adminError(result.error, "save fact", "facts"),
      };
    }

    const factId = result.data.id;

    if (hasQuizInput && quiz) {
      const quizResult = await auth.supabase.from("quiz_questions").insert({
        ...quiz,
        fact_id: factId,
        is_active: true,
      });

      if (quizResult.error) {
        if (!input.id) {
          await auth.supabase.from("facts").delete().eq("id", factId);
        }

        return {
          ok: false,
          message: adminError(
            quizResult.error,
            "create quiz question for fact",
            "quiz_questions",
          ),
        };
      }
    }

    return {
      id: factId,
      ok: true,
      message: hasPermission(auth, "facts.publish")
        ? "Fait enregistré."
        : "Ton fait a été envoyé pour validation.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Ce fait n'a pas pu être enregistré.",
    };
  }
}

export async function deleteAdminFact(id: string): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "facts.manage")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const { error } = await auth.supabase.from("facts").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: adminError(error, "delete fact", "facts"),
    };
  }

  return { ok: true, message: "Fait supprime." };
}

export async function updateAdminFactStatus(
  id: string,
  status: Extract<FactStatus, "published" | "rejected" | "draft" | "pending_review">,
): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "facts.publish")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const { error } = await auth.supabase
    .from("facts")
    .update({
      published_at: status === "published" ? new Date().toISOString() : null,
      status,
    })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      message: adminError(error, "update fact status", "facts"),
    };
  }

  const messages: Record<typeof status, string> = {
    draft: "Fait repasse en brouillon.",
    pending_review: "Fait renvoye en validation.",
    published: "Fait publié.",
    rejected: "Fait rejete.",
  };

  return { ok: true, message: messages[status] };
}

export async function updateProfileRole(
  id: string,
  role: UserRole,
): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "users.manage")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const { error } = await auth.supabase
    .from("profiles")
    .update({ role })
    .eq("id", id);

  if (error) {
    return {
      ok: false,
      message: adminError(error, "update profile role", "profiles"),
    };
  }

  return { ok: true, message: "Rôle mis à jour." };
}

export async function deleteAdminUser(id: string): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "users.delete")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const { error } = await auth.supabase.rpc("delete_admin_user", {
    p_user_id: id,
  });

  if (error) {
    return {
      ok: false,
      message: adminError(error, "delete admin user", "profiles"),
    };
  }

  return { ok: true, message: "Utilisateur supprime." };
}

export async function saveAdminRole(input: {
  description?: string | null;
  name: string;
  permissions: PermissionKey[];
  slug: string;
}): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "roles.manage")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const slug = slugify(input.slug || input.name).replace(/-/g, "_");
  const name = input.name.trim();

  if (!slug || !name) {
    return { ok: false, message: "Nom et identifiant du rôle sont requis." };
  }

  const permissions = [...new Set(input.permissions)];
  const payload = {
    description: input.description?.trim() || null,
    name,
    permissions,
    slug,
  };

  const { error } = await auth.supabase
    .from("roles")
    .upsert(payload, { onConflict: "slug" });

  if (error) {
    return {
      ok: false,
      message: adminError(error, "save role", "roles"),
    };
  }

  return { ok: true, message: "Rôle enregistré." };
}

export async function deleteAdminRole(slug: string): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "roles.manage")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const { error } = await auth.supabase.from("roles").delete().eq("slug", slug);

  if (error) {
    return {
      ok: false,
      message: adminError(error, "delete role", "roles"),
    };
  }

  return { ok: true, message: "Rôle supprimé." };
}

export async function saveAdminGrade(input: {
  badge?: string | null;
  description?: string | null;
  display_order?: number;
  id?: string;
  name: string;
  required_goals: number;
  slug?: string;
}): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "grades.manage")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const name = input.name.trim();
  const requiredGoals = Math.max(0, Math.floor(input.required_goals));
  const requestedBadge = input.badge?.trim() || "sparkles";
  const badge = gradeIconOptions.some((option) => option.value === requestedBadge)
    ? requestedBadge
    : "sparkles";

  if (!name) {
    return { ok: false, message: "Le nom du grade est requis." };
  }

  const payload = {
    badge,
    description: input.description?.trim() || null,
    display_order: input.display_order ?? requiredGoals,
    name,
    required_goals: requiredGoals,
    slug: slugify(input.slug || name),
  };

  const result = input.id
    ? await auth.supabase.from("grades").update(payload).eq("id", input.id)
    : await auth.supabase.from("grades").insert(payload);

  if (result.error) {
    return {
      ok: false,
      message: adminError(result.error, "save grade", "grades"),
    };
  }

  return { ok: true, message: "Grade enregistré." };
}

export async function deleteAdminGrade(id: string): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!hasPermission(auth, "grades.manage")) {
    return { ok: false, message: "Permission insuffisante." };
  }

  const { error } = await auth.supabase.from("grades").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: adminError(error, "delete grade", "grades"),
    };
  }

  return { ok: true, message: "Grade supprime." };
}
