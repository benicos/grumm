"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { getAdminCategory, saveAdminCategory } from "@/lib/admin";
import { AdminBackLink, AdminField } from "../forms";
import {
  AdminButton,
  AdminCard,
  AdminNotice,
  AdminPageHeading,
} from "../ui";

type ThemeFormState = {
  accent_color: string;
  id: string;
  name: string;
  slug: string;
  tone: string;
};

const emptyTheme: ThemeFormState = {
  accent_color: "#465fff",
  id: "",
  name: "",
  slug: "",
  tone: "from-[#465fff] to-[#7592ff]",
};

function getTonePreviewBackground(tone: string) {
  const colors = [...tone.matchAll(/\[(#[^\]]+)\]/g)]
    .map((match) => match[1])
    .filter(Boolean);

  if (colors.length > 0) {
    return `linear-gradient(135deg, ${colors.join(", ")})`;
  }

  const trimmedTone = tone.trim();

  return trimmedTone || "linear-gradient(135deg, #465fff, #7592ff)";
}

function isCssColor(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  if (typeof CSS !== "undefined" && CSS.supports) {
    return CSS.supports("color", trimmedValue);
  }

  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmedValue);
}

export default function ThemeEditor({ themeId }: { themeId?: string }) {
  const [form, setForm] = useState<ThemeFormState>(emptyTheme);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(themeId));
  const [busy, setBusy] = useState(false);
  const editing = Boolean(themeId);
  const accentColorIsValid = isCssColor(form.accent_color);
  const previewAccentColor = accentColorIsValid ? form.accent_color : "#465fff";
  const previewBackground = getTonePreviewBackground(form.tone);

  useEffect(() => {
    if (!themeId) {
      return;
    }

    const currentThemeId = themeId;
    let mounted = true;

    async function loadTheme() {
      try {
        const theme = await getAdminCategory(currentThemeId);

        if (!mounted) {
          return;
        }

        if (!theme) {
          setError("Ce thème est introuvable.");
          return;
        }

        setForm({
          accent_color: theme.accent_color,
          id: theme.id,
          name: theme.name,
          slug: theme.slug,
          tone: theme.tone,
        });
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Le thème ne peut pas être chargé.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadTheme();

    return () => {
      mounted = false;
    };
  }, [themeId]);

  async function submitTheme(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await saveAdminCategory({
      accent_color: form.accent_color,
      id: form.id || undefined,
      name: form.name,
      slug: form.slug || undefined,
      tone: form.tone,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);

    if (!editing) {
      setForm(emptyTheme);
    }
  }

  return (
    <>
      <AdminPageHeading
        current={editing ? "Modifier un thème" : "Créer un thème"}
        title={editing ? "Modifier un thème" : "Créer un thème"}
        description="Nom, identifiant et couleur de la catégorie."
        action={<AdminBackLink href="/admin/themes">Retour aux thèmes</AdminBackLink>}
      />
      <AdminNotice message={message} />
      <AdminNotice message={error} tone="error" />

      <AdminCard className="p-6">
        {loading ? (
          <div className="h-72 animate-pulse rounded-2xl bg-gray-100" />
        ) : (
          <form onSubmit={submitTheme} className="grid gap-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <AdminField
                label="Nom"
                value={form.name}
                onChange={(name) =>
                  setForm((current) => ({ ...current, name }))
                }
              />
              <AdminField
                label="Slug"
                value={form.slug}
                onChange={(slug) =>
                  setForm((current) => ({ ...current, slug }))
                }
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <AdminField
                label="Couleur d’accent"
                type="color"
                value={form.accent_color}
                onChange={(accent_color) =>
                  setForm((current) => ({ ...current, accent_color }))
                }
              />
              <AdminField
                label="Ton du thème"
                value={form.tone}
                onChange={(tone) =>
                  setForm((current) => ({ ...current, tone }))
                }
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-800">
                  Prévisualisation du thème
                </p>
                <p className="mt-1 text-xs leading-5">
                  Aperçu du fond, du texte et de la couleur d&apos;accent avant
                  enregistrement.
                </p>
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/40 shadow-sm">
                  <div
                    className="min-h-40 p-5 text-white"
                    style={{ background: previewBackground }}
                  >
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                      style={{
                        backgroundColor: `${previewAccentColor}22`,
                        border: `1px solid ${previewAccentColor}55`,
                        color: "#ffffff",
                      }}
                    >
                      {form.name || "Thème"}
                    </span>
                    <h3 className="mt-7 max-w-xs text-2xl font-semibold leading-tight">
                      Exemple de carte Grumm.
                    </h3>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">
                      Le contraste doit rester lisible sur le fond choisi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-800">Validation rapide</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span>Accent</span>
                    <span
                      className="h-7 w-12 rounded-lg border border-gray-200"
                      style={{ backgroundColor: previewAccentColor }}
                    />
                  </div>
                  <p
                    className={
                      accentColorIsValid ? "text-green-600" : "text-red-600"
                    }
                  >
                    {accentColorIsValid
                      ? "Couleur d'accent valide."
                      : "Couleur d'accent invalide."}
                  </p>
                  <p className="text-xs leading-5 text-gray-500">
                    Pour le ton, utilise les formats TailAdmin/Tailwind
                    existants comme from-[#111827] via-[#1f2937] to-[#465fff].
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <AdminButton type="submit" disabled={busy}>
                Enregistrer
              </AdminButton>
              <AdminBackLink href="/admin/themes">Annuler</AdminBackLink>
            </div>
          </form>
        )}
      </AdminCard>
    </>
  );
}
