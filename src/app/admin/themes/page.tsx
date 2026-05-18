"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  deleteAdminCategory,
  getAdminCategories,
  saveAdminCategory,
} from "@/lib/admin";
import type { AdminCategory } from "@/lib/admin";
import { buildCssGradient, getToneBackground } from "@/lib/gradients";
import { isAdmin } from "@/lib/roles";
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

type CategoryFormState = {
  accent_color: string;
  direction: string;
  from: string;
  id: string;
  name: string;
  slug: string;
  to: string;
  tone: string;
  via: string;
};

const emptyCategory: CategoryFormState = {
  accent_color: "#ffd166",
  direction: "to-bottom-right",
  from: "#0b1424",
  id: "",
  name: "",
  slug: "",
  to: "#f0a95a",
  tone: "",
  via: "#132744",
};

function categoryToForm(category: AdminCategory): CategoryFormState {
  return {
    ...emptyCategory,
    accent_color: category.accent_color,
    from: category.accent_color,
    id: category.id,
    name: category.name,
    slug: category.slug,
    tone: category.tone,
  };
}

function buildToneFromForm(form: CategoryFormState) {
  return buildCssGradient({
    direction: form.direction,
    from: form.from,
    to: form.to,
    via: form.via,
  });
}

export default function AdminThemesPage() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<CategoryFormState>(emptyCategory);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManageThemes = isAdmin(profile?.role);
  const previewTone = form.tone || buildToneFromForm(form);
  const previewBackground = getToneBackground(previewTone);

  async function loadThemes(nextPage = page, nextQuery = query) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAdminCategories({
        page: nextPage,
        pageSize,
        query: nextQuery,
      });
      setCategories(result.items);
      setTotal(result.total);
      setPage(result.page);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les themes.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialThemes() {
      try {
        const result = await getAdminCategories({ page, pageSize, query });

        if (!isMounted) {
          return;
        }

        setCategories(result.items);
        setTotal(result.total);
        setPage(result.page);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les themes.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialThemes();

    return () => {
      isMounted = false;
    };
  }, [page, pageSize, query]);

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage(null);
    setError(null);

    const result = await saveAdminCategory({
      accent_color: form.accent_color,
      id: form.id || undefined,
      name: form.name,
      slug: form.slug || undefined,
      tone: buildToneFromForm(form),
    });

    setIsBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    setForm(emptyCategory);
    await loadThemes();
  }

  async function removeCategory(category: AdminCategory) {
    if (!window.confirm(`Supprimer le theme "${category.name}" ?`)) {
      return;
    }

    setIsBusy(true);
    const result = await deleteAdminCategory(category.id);
    setIsBusy(false);
    setMessage(result.ok ? result.message : null);
    setError(result.ok ? null : result.message);
    await loadThemes();
  }

  function handleSearch(value: string) {
    setQuery(value);
    setPage(1);
    setIsLoading(true);
  }

  if (!canManageThemes) {
    return (
      <>
        <AdminPageHeader
          eyebrow="Themes"
          title="Acces reserve"
          description="La gestion des themes est reservee aux administrateurs."
        />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Taxonomie"
        title="Themes"
        description="Gere les themes, couleurs et gradients sans manipuler de classes Tailwind."
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <AdminPanel className="p-5">
          <h2 className="text-lg font-extrabold">
            {form.id ? "Modifier un theme" : "Nouveau theme"}
          </h2>

          <form onSubmit={submitCategory} className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-300">Nom</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-300">
                  Couleur accent
                </span>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="color"
                    value={form.accent_color}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        accent_color: event.target.value,
                        from: event.target.value,
                        tone: "",
                      }))
                    }
                    className="h-11 w-16 rounded border border-slate-800 bg-slate-900"
                  />
                  <span className="text-sm font-bold text-slate-300">
                    {form.accent_color}
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-300">
                  Direction
                </span>
                <select
                  value={form.direction}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      direction: event.target.value,
                      tone: "",
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
                >
                  <option value="to-bottom-right">Diagonale</option>
                  <option value="to-right">Horizontal</option>
                  <option value="to-bottom">Vertical</option>
                  <option value="to-top-right">Remontee</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["from", "Couleur 1"],
                ["via", "Milieu"],
                ["to", "Couleur 2"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-sm font-bold text-slate-300">{label}</span>
                  <input
                    type="color"
                    value={form[key as "from" | "via" | "to"]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [key]: event.target.value,
                        tone: "",
                      }))
                    }
                    className="mt-2 h-11 w-full rounded border border-slate-800 bg-slate-900"
                  />
                </label>
              ))}
            </div>

            <div
              className={`h-28 rounded-lg border border-slate-800 ${previewBackground.className}`}
              style={previewBackground.style}
            />

            <details className="rounded-md border border-slate-800 bg-slate-900 p-3">
              <summary className="cursor-pointer text-sm font-bold text-slate-300">
                Options avancees
              </summary>
              <label className="mt-3 block">
                <span className="text-sm font-bold text-slate-300">
                  Slug force
                </span>
                <input
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
                />
              </label>
            </details>

            <div className="flex flex-wrap gap-3">
              <AdminButton type="submit" disabled={isBusy}>
                Enregistrer
              </AdminButton>
              <AdminButton tone="secondary" onClick={() => setForm(emptyCategory)}>
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
              placeholder="Rechercher un theme..."
            />
            <span className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-slate-300">
              {total} themes
            </span>
          </div>

          {isLoading ? (
            <AdminLoadingRows />
          ) : categories.length > 0 ? (
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              {categories.map((category) => {
                const background = getToneBackground(category.tone);

                return (
                  <div
                    key={category.id}
                    className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
                  >
                    <div
                      className={`h-28 ${background.className}`}
                      style={background.style}
                    />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-white">
                            {category.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {category.slug}
                          </p>
                        </div>
                        <span
                          className="h-7 w-7 rounded-full border border-slate-700"
                          style={{ backgroundColor: category.accent_color }}
                        />
                      </div>
                      <div className="mt-4 flex gap-2">
                        <AdminButton
                          tone="secondary"
                          onClick={() => setForm(categoryToForm(category))}
                        >
                          Editer
                        </AdminButton>
                        <AdminButton
                          tone="danger"
                          disabled={isBusy}
                          onClick={() => removeCategory(category)}
                        >
                          Supprimer
                        </AdminButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4">
              <AdminTableEmpty label="Aucun theme trouve." />
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
      </div>
    </>
  );
}
