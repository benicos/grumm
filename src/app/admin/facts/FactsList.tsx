"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  deleteAdminFact,
  FACT_STATUS_LABELS,
  getAdminFacts,
  updateAdminFactStatus,
} from "@/lib/admin";
import type { AdminCategory, AdminFact, FactStatus } from "@/lib/admin";
import { hasPermission } from "@/lib/roles";
import { useAuth } from "../../auth/AuthProvider";
import {
  AdminButton,
  AdminLoadingRows,
  AdminMessage,
  AdminPageHeader,
  AdminPager,
  AdminPanel,
  AdminSearch,
  AdminTableEmpty,
} from "../components";

type StatusFilter = FactStatus | "all";

const factStatuses: FactStatus[] = [
  "pending_review",
  "published",
  "draft",
  "rejected",
  "archived",
];

function getAuthorLabel(fact: AdminFact) {
  if (!fact.author_id) {
    return "Import SQL";
  }

  return fact.authorProfile?.username ?? "Auteur inconnu";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function FactsList({
  description = "Liste paginée des faits, avec recherche et filtres.",
  eyebrow = "Contenu",
  initialStatusFilter = "all",
  title = "Faits",
}: {
  description?: string;
  eyebrow?: string;
  initialStatusFilter?: StatusFilter;
  title?: string;
}) {
  const { profile } = useAuth();
  const [facts, setFacts] = useState<AdminFact[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(initialStatusFilter);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canReview = hasPermission(profile, "facts.publish");
  const canDelete = hasPermission(profile, "facts.manage");
  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  async function loadFacts(nextPage = page) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAdminFacts({
        categoryId: categoryFilter,
        page: nextPage,
        pageSize,
        query,
        status: statusFilter,
      });
      setFacts(result.items);
      setCategories(result.categories);
      setTotal(result.total);
      setPage(result.page);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les faits.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialFacts() {
      try {
        const result = await getAdminFacts({
          categoryId: categoryFilter,
          page,
          pageSize,
          query,
          status: statusFilter,
        });

        if (!isMounted) {
          return;
        }

        setFacts(result.items);
        setCategories(result.categories);
        setTotal(result.total);
        setPage(result.page);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les faits.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialFacts();

    return () => {
      isMounted = false;
    };
  }, [categoryFilter, page, pageSize, query, statusFilter]);

  async function reviewFact(fact: AdminFact, status: "published" | "rejected") {
    setIsBusy(true);
    setMessage(null);
    setError(null);

    const result = await updateAdminFactStatus(fact.id, status);
    setIsBusy(false);
    setMessage(result.ok ? result.message : null);
    setError(result.ok ? null : result.message);
    await loadFacts();
  }

  async function removeFact(fact: AdminFact) {
    if (!window.confirm(`Supprimer "${fact.title}" ?`)) {
      return;
    }

    setIsBusy(true);
    const result = await deleteAdminFact(fact.id);
    setIsBusy(false);
    setMessage(result.ok ? result.message : null);
    setError(result.ok ? null : result.message);
    await loadFacts();
  }

  return (
    <>
      <AdminPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          <div className="flex flex-wrap gap-3">
            {initialStatusFilter === "pending_review" ? (
              <Link
                href="/admin/facts"
                className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
              >
                Tous les faits
              </Link>
            ) : (
              <Link
                href="/admin/facts/pending"
                className="rounded-md border border-amber-300/40 bg-amber-300/10 px-4 py-2 text-sm font-extrabold text-amber-200 hover:bg-amber-300/15"
              >
                Faits en attente
              </Link>
            )}
            <Link
              href="/admin/facts/create"
              className="rounded-md bg-amber-300 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amber-200"
            >
              Créer un fait
            </Link>
          </div>
        }
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <AdminPanel>
        <div className="grid gap-3 border-b border-slate-800 p-4 xl:grid-cols-[minmax(0,1fr)_180px_220px_auto]">
          <AdminSearch
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
              setIsLoading(true);
            }}
            placeholder="Rechercher par titre, contenu ou source..."
          />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setPage(1);
              setIsLoading(true);
            }}
            className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm font-bold text-slate-200 outline-none focus:border-amber-300"
          >
            <option value="all">Tous les statuts</option>
            {factStatuses.map((status) => (
              <option key={status} value={status}>
                {FACT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setPage(1);
              setIsLoading(true);
            }}
            className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm font-bold text-slate-200 outline-none focus:border-amber-300"
          >
            <option value="all">Tous les thèmes</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <span className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-slate-300">
            {total} faits
          </span>
        </div>

        {isLoading ? (
          <AdminLoadingRows />
        ) : facts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[920px] divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/70 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Thème</th>
                  <th className="px-4 py-3">Statut</th>
                  {canReview && <th className="px-4 py-3">Auteur</th>}
                  <th className="px-4 py-3">Creation</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {facts.map((fact) => (
                  <tr key={fact.id} className="align-top">
                    <td className="max-w-md px-4 py-3">
                      <p className="font-bold text-white">{fact.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {fact.hook ?? "Sans phrase à retenir"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {categoryNameById.get(fact.category_id) ??
                        fact.categories?.name ??
                        "Sans thème"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-slate-300">
                        {FACT_STATUS_LABELS[fact.status]}
                      </span>
                    </td>
                    {canReview && (
                      <td className="px-4 py-3 text-slate-400">
                        {getAuthorLabel(fact)}
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-400">
                      {formatDate(fact.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/admin/facts/${fact.id}`}
                          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
                        >
                          {fact.status === "pending_review"
                            ? "Consulter"
                            : "Modifier"}
                        </Link>
                        {fact.status === "published" && (
                          <Link
                            href={`/fact/${fact.slug}`}
                            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
                          >
                            Voir
                          </Link>
                        )}
                        {canReview && fact.status === "pending_review" && (
                          <>
                            <AdminButton
                              disabled={isBusy}
                              onClick={() => reviewFact(fact, "published")}
                            >
                              Valider
                            </AdminButton>
                            <AdminButton
                              tone="secondary"
                              disabled={isBusy}
                              onClick={() => reviewFact(fact, "rejected")}
                            >
                              Rejeter
                            </AdminButton>
                          </>
                        )}
                        {canDelete && (
                          <AdminButton
                            tone="danger"
                            disabled={isBusy}
                            onClick={() => removeFact(fact)}
                          >
                            Supprimer
                          </AdminButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <AdminTableEmpty
              label={
                statusFilter === "pending_review"
                  ? "Aucun fait en attente."
                  : "Aucun fait trouvé."
              }
            />
          </div>
        )}

        <AdminPager
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            setIsLoading(true);
          }}
        />
      </AdminPanel>
    </>
  );
}
