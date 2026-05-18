"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  deleteAdminFact,
  getAdminFacts,
  saveAdminFact,
} from "@/lib/admin";
import type { AdminCategory, AdminFact, FactStatus } from "@/lib/admin";
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

const emptyFact: FactFormState = {
  advancedSlug: "",
  category_id: "",
  content: "",
  hook: "",
  id: "",
  source: "",
  source_url: "",
  status: "draft",
  title: "",
};

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

export default function AdminFactsPage() {
  const [facts, setFacts] = useState<AdminFact[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<FactFormState>(emptyFact);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      });
      setFacts(result.items);
      setCategories(result.categories);
      setTotal(result.total);
      setPage(result.page);
      setForm((current) => ({
        ...current,
        category_id: current.category_id || result.categories[0]?.id || "",
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
      try {
        const result = await getAdminFacts({ page, pageSize, query });

        if (!isMounted) {
          return;
        }

        setFacts(result.items);
        setCategories(result.categories);
        setTotal(result.total);
        setPage(result.page);
        setForm((current) => ({
          ...current,
          category_id: current.category_id || result.categories[0]?.id || "",
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
  }, [page, pageSize, query]);

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
    });

    setIsBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    setForm({ ...emptyFact, category_id: form.category_id });
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

  function handleSearch(value: string) {
    setQuery(value);
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
        eyebrow="Contenu"
        title="Faits"
        description="Creer, modifier, publier ou archiver les faits. Slug et ordre sont automatises."
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <AdminPanel className="p-5">
          <h2 className="text-lg font-extrabold">
            {form.id ? "Modifier un fait" : "Nouveau fait"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Le slug et l&apos;ordre interne sont generes automatiquement.
          </p>

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
                <option value="draft">Brouillon</option>
                <option value="published">Publie</option>
                <option value="archived">Archive</option>
              </select>
            </label>

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
                Enregistrer
              </AdminButton>
              <AdminButton
                tone="secondary"
                onClick={() =>
                  setForm({ ...emptyFact, category_id: form.category_id })
                }
              >
                Nouveau
              </AdminButton>
            </div>
          </form>
        </AdminPanel>

        <AdminPanel>
          <div className="grid gap-3 border-b border-slate-800 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <AdminSearch
              value={query}
              onChange={handleSearch}
              placeholder="Rechercher par titre, contenu ou source..."
            />
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
                    <th className="px-4 py-3">Source</th>
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
                          {fact.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{fact.source}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <AdminButton
                            tone="secondary"
                            onClick={() => setForm(factToForm(fact))}
                          >
                            Editer
                          </AdminButton>
                          <Link
                            href={`/fact/${fact.slug}`}
                            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
                          >
                            Voir
                          </Link>
                          <AdminButton
                            tone="danger"
                            disabled={isBusy}
                            onClick={() => removeFact(fact)}
                          >
                            Supprimer
                          </AdminButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4">
              <AdminTableEmpty label="Aucun fait trouve." />
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
