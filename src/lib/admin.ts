import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatAppError, getConfiguredErrorMessage } from "@/lib/errors";
import type { UserRole } from "@/lib/roles";
import { isAdmin } from "@/lib/roles";
import { slugify } from "@/lib/slug";
import type { Database } from "@/types/database";

export type AdminCategory = Database["public"]["Tables"]["categories"]["Row"];
export type AdminProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type FactStatus = Database["public"]["Tables"]["facts"]["Row"]["status"];
export type AdminFactAuthor = Pick<AdminProfile, "id" | "role" | "username">;
export type AdminFact = Database["public"]["Tables"]["facts"]["Row"] & {
  authorProfile?: AdminFactAuthor | null;
  categories: Pick<AdminCategory, "name" | "slug"> | null;
};

export const FACT_STATUS_LABELS: Record<FactStatus, string> = {
  archived: "Archive",
  draft: "Brouillon",
  pending_review: "En attente",
  published: "Publie",
  rejected: "Rejete",
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

type AdminMutationResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

type AdminAuth = Awaited<ReturnType<typeof getAuthenticatedAdminClient>>;
type AdminClient = Extract<AdminAuth, { ok: true }>["supabase"];

const DEFAULT_PAGE_SIZE = 12;
const ADMIN_FACT_SELECT =
  "id,category_id,slug,title,hook,content,source,source_url,status,published_at,display_order,tone,accent_color,created_at,updated_at,categories(name,slug)";

function normalizeSearchTerm(query?: string) {
  return query?.trim().replace(/[%,_]/g, " ").replace(/\s+/g, " ") ?? "";
}

function getRange(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 50));
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

  if (role !== "administrateur" && role !== "redacteur") {
    return { ok: false as const, message: "Acces reserve." };
  }

  return { ok: true as const, role, supabase, user };
}

function adminError(error: unknown, operation: string, table: string) {
  return formatAppError(error, {
    context: {
      operation,
      source: "Supabase",
      table,
    },
    prodMessage: "Cette action n'a pas pu etre effectuee.",
  });
}

function throwAdminError(error: unknown, operation: string, table: string) {
  throw new Error(adminError(error, operation, table));
}

function requireAdmin(auth: Extract<AdminAuth, { ok: true }>) {
  if (!isAdmin(auth.role)) {
    throw new Error("Acces reserve aux administrateurs.");
  }
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
  const adminRole = isAdmin(auth.role);
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
    .limit(5);
  let recentFactsRequest = auth.supabase
    .from("facts")
    .select(ADMIN_FACT_SELECT)
    .order("created_at", { ascending: false })
    .limit(6);

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
    auth.supabase
      .from("user_fact_views")
      .select("id", { count: "exact", head: true }),
    auth.supabase
      .from("user_daily_progress")
      .select("id", { count: "exact", head: true })
      .eq("progress_date", today)
      .eq("goal_completed", true),
    pendingFactsRequest,
    recentFactsRequest,
    adminRole
      ? auth.supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
      : Promise.resolve({ count: 0, error: null }),
    adminRole
      ? auth.supabase
          .from("profiles")
          .select("*")
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
      { label: "Themes", value: categoriesCount.count ?? 0 },
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
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
  status,
}: {
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

  if (!isAdmin(auth.role)) {
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
}: {
  page?: number;
  pageSize?: number;
  query?: string;
} = {}): Promise<AdminListResult<AdminProfile>> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    throw new Error(auth.message);
  }

  requireAdmin(auth);

  const { from, page: safePage, pageSize: safePageSize, to } = getRange(
    page,
    pageSize,
  );
  const searchTerm = normalizeSearchTerm(query);
  let request = auth.supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchTerm) {
    request = request.ilike("username", `%${searchTerm}%`);
  }

  const { data, count, error } = await request;

  if (error) {
    throwAdminError(error, "load admin profiles", "profiles");
  }

  return {
    items: (data ?? []) as AdminProfile[],
    page: safePage,
    pageSize: safePageSize,
    total: count ?? 0,
  };
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

  if (!isAdmin(auth.role)) {
    return { ok: false, message: "Acces reserve aux administrateurs." };
  }

  const name = input.name.trim();

  if (!name) {
    return { ok: false, message: "Le nom du theme est requis." };
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

  return { ok: true, message: "Theme enregistre." };
}

export async function deleteAdminCategory(
  id: string,
): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!isAdmin(auth.role)) {
    return { ok: false, message: "Acces reserve aux administrateurs." };
  }

  const { error } = await auth.supabase.from("categories").delete().eq("id", id);

  if (error) {
    return {
      ok: false,
      message: adminError(error, "delete category", "categories"),
    };
  }

  return { ok: true, message: "Theme supprime." };
}

export async function saveAdminFact(input: {
  advancedSlug?: string;
  category_id: string;
  content: string;
  hook: string;
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
  const hook = input.hook.trim();

  if (!input.category_id || !title || !hook || !input.content.trim()) {
    return {
      ok: false,
      message: "Titre, hook, contenu et theme sont requis.",
    };
  }

  try {
    const slug = slugify(input.advancedSlug || title || hook);
    const status = isAdmin(auth.role) ? input.status ?? "published" : "pending_review";
    const basePayload = {
      category_id: input.category_id,
      content: input.content.trim(),
      hook,
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
          : "Ce fait n'a pas pu etre enregistre.",
    };
  }

  return {
    ok: true,
    message: isAdmin(auth.role)
      ? "Fait enregistre."
      : "Ton fait a ete envoye pour validation.",
  };
}

export async function deleteAdminFact(id: string): Promise<AdminMutationResult> {
  const auth = await getAuthenticatedAdminClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  if (!isAdmin(auth.role)) {
    return { ok: false, message: "Acces reserve aux administrateurs." };
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

  if (!isAdmin(auth.role)) {
    return { ok: false, message: "Acces reserve aux administrateurs." };
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
    published: "Fait publie.",
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

  if (!isAdmin(auth.role)) {
    return { ok: false, message: "Acces reserve aux administrateurs." };
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

  return { ok: true, message: "Role mis a jour." };
}
