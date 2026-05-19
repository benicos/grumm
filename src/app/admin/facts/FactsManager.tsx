"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  deleteAdminFact,
  FACT_STATUS_LABELS,
  getAdminFacts,
  saveAdminFact,
  updateAdminFactStatus,
} from "@/lib/admin";
import type { AdminCategory, AdminFact, FactStatus } from "@/lib/admin";
import type { UserRole } from "@/lib/roles";
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

type FactFormState = {
  advancedSlug: string;
  category_id: string;
  content: string;
  hook: string;
  id: string;
  source: string;
  source_url: string;
  status: FactStatus;
  title: string;
};

const factStatuses: FactStatus[] = [
  "pending_review",
  "published",
  "draft",
  "rejected",
  "archived",
];

function createEmptyFact(role?: UserRole | null): FactFormState {
  return {
    advancedSlug: "",
    category_id: "",
    content: "",
    hook: "",
    id: "",
    source: "",
    source_url: "",
    status: role === "administrateur" ? "published" : "pending_review",
    title: "",
  };
}

function factToForm(fact: AdminFact): FactFormState {
  return {
    advancedSlug: fact.slug,
    category_id: fact.category_id,
    content: fact.content,
    hook: fact.hook,
    id: fact.id,
    source: fact.source,
    source_url: fact.source_url ?? "",
    status: fact.status,
    title: fact.title,
  };
}

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

function Field({
  label,
  onChange,
  textarea,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-300">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 min-h-28 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
        />
      )}
    </label>
  );
}

export default function FactsManager({
  description = "Creer, modifier, publier ou rejeter les faits. Slug et ordre sont automatises.",
  eyebrow = "Contenu",
  initialStatusFilter = "all",
  title = "Faits",
}: {
  description?: string;
  eyebrow?: string;
  initialStatusFilter?: StatusFilter;
  title?: string;
}) {
  const [facts, setFacts] = useState<AdminFact[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<FactFormState>(() => createEmptyFact());
  const [role, setRole] = useState<UserRole | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(initialStatusFilter);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canReview = role === "administrateur";
  const selectedFact = useMemo(
    () => facts.find((fact) => fact.id === form.id) ?? null,
    [facts, form.id],
  );
  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  async function loadFacts(nextPage = page, nextQuery = query) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAdminFacts({
        page: nextPage,
        pageSize,
        query: nextQuery,
        status: statusFilter,
      });
      setFacts(result.items);
      setCategories(result.categories);
      setRole(result.role);
      setTotal(result.total);
      setPage(result.page);
      setForm((current) => ({
        ...current,
        category_id: current.category_id || result.categories[0]?.id || "",
        status: current.id ? current.status : createEmptyFact(result.role).status,
      }));
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
      setIsLoading(true);

      try {
        const result = await getAdminFacts({
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
        setRole(result.role);
        setTotal(result.total);
        setPage(result.page);
        setForm((current) => ({
          ...current,
          category_id: current.category_id || result.categories[0]?.id || "",
          status: current.id
            ? current.status
            : createEmptyFact(result.role).status,
        }));
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
  }, [page, pageSize, query, statusFilter]);

  async function submitFact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage(null);
    setError(null);

    const result = await saveAdminFact({
      ...form,
      advancedSlug: form.advancedSlug || undefined,
      id: form.id || undefined,
      source_url: form.source_url || null,
      status: canReview ? form.status : undefined,
    });

    setIsBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    setForm({
      ...createEmptyFact(role),
      category_id: form.category_id,
    });
    await loadFacts();
  }

  async function reviewFact(
    fact: AdminFact,
    status: "published" | "rejected",
  ) {
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

  function selectFact(fact: AdminFact) {
    setForm(factToForm(fact));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
    setIsLoading(true);
  }

  function handleStatusFilter(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
    setIsLoading(true);
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
    setIsLoading(true);
  }

  return (
    <>
      <AdminPageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={
          initialStatusFilter === "pending_review" ? (
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
          )
        }
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <AdminPanel className="p-5">
          <h2 className="text-lg font-extrabold">
            {form.id ? "Consulter / modifier" : "Nouveau fait"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {canReview
              ? "Un administrateur peut publier, rejeter ou corriger un fait."
              : "Tes nouveaux faits sont envoyes en validation."}
          </p>

          {form.id && (
            <div className="mt-4 rounded-md border border-slate-800 bg-slate-900 p-3 text-xs text-slate-400">
              <p>
                Statut :{" "}
                <span className="font-bold text-slate-200">
                  {FACT_STATUS_LABELS[form.status]}
                </span>
              </p>
              {canReview && (
                <p className="mt-1">
                  Auteur :{" "}
                  <span className="font-bold text-slate-200">
                    {selectedFact ? getAuthorLabel(selectedFact) : "Auteur inconnu"}
                  </span>
                </p>
              )}
            </div>
          )}

          <form onSubmit={submitFact} className="mt-5 grid gap-4">
            <Field
              label="Titre"
              value={form.title}
              onChange={(value) =>
                setForm((current) => ({ ...current, title: value }))
              }
            />
            <Field
              label="Hook"
              value={form.hook}
              onChange={(value) =>
                setForm((current) => ({ ...current, hook: value }))
              }
            />
            <Field
              label="Contenu"
              textarea
              value={form.content}
              onChange={(value) =>
                setForm((current) => ({ ...current, content: value }))
              }
            />

            <label className="block">
              <span className="text-sm font-bold text-slate-300">Theme</span>
              <select
                value={form.category_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category_id: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            {canReview ? (
              <label className="block">
                <span className="text-sm font-bold text-slate-300">Statut</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as FactStatus,
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
                >
                  {factStatuses.map((status) => (
                    <option key={status} value={status}>
                      {FACT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
                Statut automatique : en attente de validation.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Field
                label="Source"
                value={form.source}
                onChange={(value) =>
                  setForm((current) => ({ ...current, source: value }))
                }
              />
              <Field
                label="URL source"
                type="url"
                value={form.source_url}
                onChange={(value) =>
                  setForm((current) => ({ ...current, source_url: value }))
                }
              />
            </div>

            <details className="rounded-md border border-slate-800 bg-slate-900 p-3">
              <summary className="cursor-pointer text-sm font-bold text-slate-300">
                Options avancees
              </summary>
              <div className="mt-3">
                <Field
                  label="Slug force"
                  value={form.advancedSlug}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      advancedSlug: value,
                    }))
                  }
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Laisse vide pour regenerer automatiquement depuis le titre.
                </p>
              </div>
            </details>

            <div className="flex flex-wrap gap-3">
              <AdminButton type="submit" disabled={isBusy}>
                {canReview ? "Enregistrer" : "Envoyer en validation"}
              </AdminButton>
              <AdminButton
                tone="secondary"
                onClick={() =>
                  setForm({
                    ...createEmptyFact(role),
                    category_id: form.category_id,
                  })
                }
              >
                Nouveau
              </AdminButton>
            </div>
          </form>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-3 border-b border-slate-800 p-4 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
            <AdminSearch
              value={query}
              onChange={handleSearch}
              placeholder="Rechercher par titre, contenu ou source..."
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                handleStatusFilter(event.target.value as StatusFilter)
              }
              className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm font-bold text-slate-200 outline-none focus:border-amber-300"
            >
              <option value="all">Tous les statuts</option>
              {factStatuses.map((status) => (
                <option key={status} value={status}>
                  {FACT_STATUS_LABELS[status]}
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
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-900/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Titre</th>
                    <th className="px-4 py-3">Theme</th>
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
                          {fact.hook}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {categoryNameById.get(fact.category_id) ??
                          fact.categories?.name ??
                          "Sans theme"}
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
                          <AdminButton
                            tone="secondary"
                            onClick={() => selectFact(fact)}
                          >
                            {fact.status === "pending_review"
                              ? "Consulter"
                              : "Modifier"}
                          </AdminButton>
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
                          {canReview && (
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
                    : "Aucun fait trouve."
                }
              />
            </div>
          )}

          <AdminPager
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={handlePageChange}
          />
        </AdminPanel>
      </div>
    </>
  );
}
