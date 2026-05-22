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

export default function ThemeEditor({ themeId }: { themeId?: string }) {
  const [form, setForm] = useState<ThemeFormState>(emptyTheme);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(themeId));
  const [busy, setBusy] = useState(false);
  const editing = Boolean(themeId);

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
