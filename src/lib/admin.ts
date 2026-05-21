import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { gradeIconOptions, paginationConfig } from "@/config/app";
import { getBadgeInfo } from "@/lib/badges";
import { formatAppError, getConfiguredErrorMessage } from "@/lib/errors";
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

export type AdminAnalyticsData = {
  overview: {
    anonymousVisitors: number;
    averageSessionSeconds: number;
    factsPerSession: number;
    factsRead: number;
    signedInUsers: number;
    totalSessions: number;
    uniqueVisitors: number;
  };
  platforms: {
    count: number;
    label: string;
    percent: number;
  }[];
  engagement: {
    interactionRate: number;
    likes: number;
    saves: number;
    shares: number;
    sourceClicks: number;
  };
  reading: {
    averageReadSeconds: number;
    completionRate: number;
    topLikedFacts: AdminAnalyticsFactStat[];
    topReadFacts: AdminAnalyticsFactStat[];
    topSavedFacts: AdminAnalyticsFactStat[];
  };
  retention: {
    averageReturnFrequency: number;
    returnedAtLeast2Times: number;
    returnedAfter7Days: number;
  };
  categories: {
    bestEngagementThemes: AdminAnalyticsThemeStat[];
    topOpenedThemes: AdminAnalyticsThemeStat[];
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

type AdminMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

type AdminAuth = Awaited<ReturnType<typeof getAuthenticatedAdminClient>>;
type AdminClient = Extract<AdminAuth, { ok: true }>["supabase"];

const DEFAULT_PAGE_SIZE: number = paginationConfig.adminDefaultPageSize;
const ADMIN_FACT_SELECT =
  "id,category_id,slug,title,hook,content,source,source_url,status,published_at,display_order,tone,accent_color,created_at,updated_at,categories(name,slug)";

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

export async function getAdminAnalyticsData(): Promise<AdminAnalyticsData> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  if (auth.role !== "administrateur") {
    throw new Error("Accès réservé aux administrateurs.");
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const adminUserIds = await getAdminUserIds(auth.supabase);
  const [sessionsResult, eventsResult, readsResult, likesResult, savesResult] =
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
        .from("likes")
        .select("fact_id,created_at,user_id")
        .gte("created_at", since)
        .limit(6000),
      auth.supabase
        .from("saves")
        .select("fact_id,created_at,user_id")
        .gte("created_at", since)
        .limit(6000),
    ]);

  const error =
    sessionsResult.error ??
    eventsResult.error ??
    readsResult.error ??
    likesResult.error ??
    savesResult.error;

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
  const likes = excludeAdminUsers(
    (likesResult.data ?? []) as { fact_id: string; user_id: string | null }[],
    adminUserIds,
  );
  const saves = excludeAdminUsers(
    (savesResult.data ?? []) as { fact_id: string; user_id: string | null }[],
    adminUserIds,
  );
  const factIds = [
    ...new Set([
      ...reads.map((row) => row.fact_id),
      ...likes.map((row) => row.fact_id),
      ...saves.map((row) => row.fact_id),
      ...events
        .filter((row) => row.entity_type === "fact" && row.entity_id)
        .map((row) => row.entity_id as string),
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
  const visitors = new Set(
    sessions.map(getAnalyticsIdentity).filter((value): value is string => Boolean(value)),
  );
  const signedInUsers = new Set(
    sessions.map((session) => session.user_id).filter((value): value is string => Boolean(value)),
  );
  const anonymousVisitors = new Set(
    sessions
      .filter((session) => !session.user_id)
      .map((session) => session.anonymous_id)
      .filter((value): value is string => Boolean(value)),
  );
  const platformCounts = countBy(
    sessions.map((session) => session.platform.toUpperCase()),
  );
  const readCounts = countBy(reads.map((row) => row.fact_id));
  const likeCounts = countBy(likes.map((row) => row.fact_id));
  const saveCounts = countBy(saves.map((row) => row.fact_id));
  const likesEvents = events.filter((event) => event.event_name === "fact_liked").length;
  const savesEvents = events.filter((event) => event.event_name === "fact_saved").length;
  const shares = events.filter((event) => event.event_name === "fact_shared").length;
  const sourceClicks = events.filter((event) => event.event_name === "source_clicked").length;
  const categoryOpenedEvents = events.filter(
    (event) => event.event_name === "category_opened",
  );
  const sessionsByIdentity = new Map<string, AnalyticsSessionRow[]>();

  sessions.forEach((session) => {
    const identity = getAnalyticsIdentity(session);

    if (!identity) {
      return;
    }

    sessionsByIdentity.set(identity, [
      ...(sessionsByIdentity.get(identity) ?? []),
      session,
    ]);
  });

  const returnedAtLeast2Times = [...sessionsByIdentity.values()].filter(
    (rows) => rows.length >= 2,
  ).length;
  const returnedAfter7Days = [...sessionsByIdentity.values()].filter((rows) => {
    const times = rows.map((row) => new Date(row.started_at).getTime());

    return Math.max(...times) - Math.min(...times) >= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const topOpenedThemes = new Map<string, AdminAnalyticsThemeStat>();
  const bestEngagementThemes = new Map<string, AdminAnalyticsThemeStat>();

  reads.forEach((read) => {
    const category = getFactCategory(factsById.get(read.fact_id));

    if (!category) {
      return;
    }

    const current = topOpenedThemes.get(category.slug);
    topOpenedThemes.set(category.slug, {
      ...category,
      value: (current?.value ?? 0) + 1,
    });
  });

  categoryOpenedEvents.forEach((event) => {
    const slug =
      typeof event.metadata === "object" &&
      event.metadata &&
      !Array.isArray(event.metadata) &&
      typeof event.metadata.slug === "string"
        ? event.metadata.slug
        : null;
    const name =
      typeof event.metadata === "object" &&
      event.metadata &&
      !Array.isArray(event.metadata) &&
      typeof event.metadata.name === "string"
        ? event.metadata.name
        : slug;

    if (!slug || !name) {
      return;
    }

    const current = topOpenedThemes.get(slug);
    topOpenedThemes.set(slug, {
      accent: "#fbbf24",
      name,
      slug,
      value: (current?.value ?? 0) + 1,
    });
  });

  events
    .filter((event) =>
      ["fact_liked", "fact_saved", "fact_shared", "source_clicked"].includes(
        event.event_name,
      ),
    )
    .forEach((event) => {
      if (!event.entity_id) {
        return;
      }

      const category = getFactCategory(factsById.get(event.entity_id));

      if (!category) {
        return;
      }

      const current = bestEngagementThemes.get(category.slug);
      bestEngagementThemes.set(category.slug, {
        ...category,
        value: (current?.value ?? 0) + 1,
      });
    });

  return {
    overview: {
      anonymousVisitors: anonymousVisitors.size,
      averageSessionSeconds: average(
        sessions
          .map((session) => session.duration_seconds ?? 0)
          .filter((duration) => duration > 0),
      ),
      factsPerSession:
        sessions.length > 0
          ? Number((reads.length / sessions.length).toFixed(1))
          : 0,
      factsRead: reads.length,
      signedInUsers: signedInUsers.size,
      totalSessions: sessions.length,
      uniqueVisitors: visitors.size,
    },
    platforms: [...platformCounts.entries()].map(([label, count]) => ({
      count,
      label,
      percent: percent(count, sessions.length),
    })),
    engagement: {
      interactionRate: percent(likesEvents + savesEvents + shares, Math.max(reads.length, 1)),
      likes: likesEvents || likes.length,
      saves: savesEvents || saves.length,
      shares,
      sourceClicks,
    },
    reading: {
      averageReadSeconds: average(
        reads
          .map((read) => read.duration_seconds ?? 0)
          .filter((duration) => duration > 0),
      ),
      completionRate: percent(
        reads.filter((read) => read.completed).length,
        reads.length,
      ),
      topLikedFacts: toFactStats(likeCounts, factsById),
      topReadFacts: toFactStats(readCounts, factsById),
      topSavedFacts: toFactStats(saveCounts, factsById),
    },
    retention: {
      averageReturnFrequency:
        visitors.size > 0 ? Number((sessions.length / visitors.size).toFixed(1)) : 0,
      returnedAtLeast2Times,
      returnedAfter7Days,
    },
    categories: {
      bestEngagementThemes: toThemeStats(bestEngagementThemes),
      topOpenedThemes: toThemeStats(topOpenedThemes),
    },
  };
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

export async function getAdminFacts({
  authorId,
  categoryId,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  status,
}: {
  authorId?: string;
  categoryId?: string;
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
      `title.ilike.%${searchTerm}%,hook.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,source.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%`,
    );
  }

  if (status && status !== "all") {
    factsRequest = factsRequest.eq("status", status);
  }

  if (categoryId && categoryId !== "all") {
    factsRequest = factsRequest.eq("category_id", categoryId);
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

  const [factResult, categoriesResult] = await Promise.all([
    auth.supabase
      .from("facts")
      .select(ADMIN_FACT_SELECT)
      .eq("id", id)
      .maybeSingle(),
    auth.supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true }),
  ]);

  const error = factResult.error ?? categoriesResult.error;

  if (error) {
    throwAdminError(error, "load admin fact", "facts");
  }

  const hydrated = factResult.data
    ? (await attachFactAuthors(auth, [factResult.data as AdminFact]))[0]
    : null;

  return {
    categories: (categoriesResult.data ?? []) as AdminCategory[],
    fact: hydrated,
    role: auth.role,
  };
}

export async function getAdminRoles({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
}: {
  page?: number;
  pageSize?: number;
  query?: string;
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
}: {
  page?: number;
  pageSize?: number;
  query?: string;
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
  id?: string;
  name: string;
  slug?: string;
  tone: string;
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

  const payload = {
    accent_color: input.accent_color || "#ffd166",
    name,
    slug: slugify(input.slug || name),
    tone:
      input.tone.trim() ||
      "from-[#0b1424] via-[#132744] to-[#f0a95a]",
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

export async function saveAdminFact(input: {
  advancedSlug?: string;
  category_id: string;
  content: string;
  hook?: string | null;
  id?: string;
  source: string;
  source_url: string | null;
  status?: FactStatus;
  title: string;
}): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const title = input.title.trim();
  const hook = input.hook?.trim() ?? "";

  if (!input.category_id || !title || !input.content.trim()) {
    return {
      ok: false,
      message: "Titre, contenu et thème sont requis.",
    };
  }

  try {
    const slug = slugify(input.advancedSlug || title || hook);
    const canPublish = hasPermission(auth, "facts.publish");
    const status = canPublish ? input.status ?? "published" : "pending_review";
    const basePayload = {
      category_id: input.category_id,
      content: input.content.trim(),
      hook: hook || null,
      published_at:
        status === "published" ? new Date().toISOString() : null,
      slug,
      source: input.source.trim() || "Source non renseignee",
      source_url: input.source_url?.trim() || null,
      status,
      title,
    };

    const result = input.id
      ? await auth.supabase.from("facts").update(basePayload).eq("id", input.id)
      : await auth.supabase.from("facts").insert({
          ...basePayload,
          author_id: auth.user.id,
          display_order: await getNextFactDisplayOrder(auth.supabase),
        });

    if (result.error) {
      return {
        ok: false,
        message: adminError(result.error, "save fact", "facts"),
      };
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Ce fait n’a pas pu être enregistré.",
    };
  }

  return {
    ok: true,
    message: hasPermission(auth, "facts.publish")
      ? "Fait enregistré."
      : "Ton fait a ete envoye pour validation.",
  };
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
