"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  getAdminCategory,
  saveAdminCategory,
} from "@/lib/admin";
import type { AdminCategory } from "@/lib/admin";
import { buildCssGradient, getToneBackground } from "@/lib/gradients";
import {
  AdminButton,
  AdminMessage,
  AdminPageHeader,
  AdminPanel,
} from "../components";

type CategoryFormState = {
  accent_color: string;
  direction: string;
  from: string;
  id: string;
  name: string;
  slug: string;
  tone: string;
  to: string;
  via: string;
};

const emptyCategory: CategoryFormState = {
  accent_color: "#ffd166",
  direction: "to-bottom-right",
  from: "#0b1424",
  id: "",
  name: "",
  slug: "",
  tone: "",
  to: "#f0a95a",
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

export default function ThemeEditor({ themeId }: { themeId?: string }) {
  const [form, setForm] = useState<CategoryFormState>(emptyCategory);
  const [isLoading, setIsLoading] = useState(Boolean(themeId));
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewTone = form.tone || buildToneFromForm(form);
  const previewBackground = getToneBackground(previewTone);
  const isEditing = Boolean(themeId);

  useEffect(() => {
    if (!themeId) {
      return;
    }

    const currentThemeId = themeId;
    let isMounted = true;

    async function loadTheme() {
      try {
        const category = await getAdminCategory(currentThemeId);

        if (isMounted && category) {
          setForm(categoryToForm(category));
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger le thème.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTheme();

    return () => {
      isMounted = false;
    };
  }, [themeId]);

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

    if (!isEditing) {
      setForm(emptyCategory);
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Taxonomie"
        title={isEditing ? "Modifier un thème" : "Créer un thème"}
        description="Couleurs, slug et gradient du thème."
        action={
          <Link
            href="/admin/themes"
            className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
          >
            Retour aux thèmes
          </Link>
        }
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <AdminPanel className="p-5">
        {isLoading ? (
          <div className="h-80 animate-pulse rounded-md bg-slate-900" />
        ) : (
          <form onSubmit={submitCategory} className="grid gap-5">
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
                <span className="text-sm font-bold text-slate-300">Direction</span>
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
              <Link
                href="/admin/themes"
                className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
              >
                Annuler
              </Link>
            </div>
          </form>
        )}
      </AdminPanel>
    </>
  );
}
