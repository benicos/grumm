"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminCategory, saveAdminCategory } from "@/lib/admin";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizeThemeIconName } from "@/lib/icons";
import { getThemeGradientStyle } from "@/lib/themeDisplay";
import ThemeIcon from "../../components/ThemeIcon";
import { AdminBackLink, AdminField, AdminHelpTooltip } from "../forms";
import IconPicker from "../components/IconPicker";
import {
  AdminButton,
  AdminCard,
  AdminNotice,
  AdminPageHeading,
} from "../ui";

type ThemeFormState = {
  accent_color: string;
  description_courte: string;
  description_longue: string;
  gradient_end: string;
  gradient_middle: string;
  gradient_start: string;
  id: string;
  keywords: string;
  name: string;
  seo_description: string;
  seo_title: string;
  theme_icon: string;
  theme_image_url: string;
};

type GradientPreset = {
  colors: [string, string, string];
  label: string;
};

const emptyTheme: ThemeFormState = {
  accent_color: "#ffd166",
  description_courte: "",
  description_longue: "",
  gradient_end: "#f0a95a",
  gradient_middle: "#132744",
  gradient_start: "#0b1424",
  id: "",
  keywords: "",
  name: "",
  seo_description: "",
  seo_title: "",
  theme_icon: "star",
  theme_image_url: "",
};

const gradientPresets: GradientPreset[] = [
  { colors: ["#07111f", "#1f2937", "#465fff"], label: "Bleu profond" },
  { colors: ["#0f172a", "#334155", "#f4ead5"], label: "Ardoise premium" },
  { colors: ["#111827", "#5b5f68", "#d8c7a1"], label: "Champagne discret" },
  { colors: ["#0b1424", "#27445f", "#88a2b6"], label: "Bleu-gris" },
  { colors: ["#120f24", "#3d2b5f", "#c4a7e7"], label: "Nocturne" },
  { colors: ["#0c1f1b", "#1f4d45", "#6ae3c0"], label: "Vert culturel" },
];

function toneFromStops(form: ThemeFormState) {
  return `linear-gradient(135deg, ${form.gradient_start}, ${form.gradient_middle}, ${form.gradient_end})`;
}

function parseKeywords(value: string) {
  return value
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export default function ThemeEditor({ themeId }: { themeId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<ThemeFormState>(emptyTheme);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(themeId));
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const editing = Boolean(themeId);
  const previewTheme = {
    ...form,
    keywords: parseKeywords(form.keywords),
    slug: "preview",
    tone: toneFromStops(form),
  };
  function updateColor(field: keyof Pick<ThemeFormState, "gradient_start" | "gradient_middle" | "gradient_end" | "accent_color">, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyGradientPreset(preset: GradientPreset) {
    setForm((current) => ({
      ...current,
      accent_color: preset.colors[2],
      gradient_end: preset.colors[2],
      gradient_middle: preset.colors[1],
      gradient_start: preset.colors[0],
    }));
  }

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
          accent_color: theme.accent_color || emptyTheme.accent_color,
          description_courte: theme.description_courte ?? "",
          description_longue: theme.description_longue ?? "",
          gradient_end: theme.gradient_end ?? emptyTheme.gradient_end,
          gradient_middle: theme.gradient_middle ?? emptyTheme.gradient_middle,
          gradient_start: theme.gradient_start ?? emptyTheme.gradient_start,
          id: theme.id,
          keywords: (theme.keywords ?? []).join(", "),
          name: theme.name,
          seo_description: theme.seo_description ?? "",
          seo_title: theme.seo_title ?? "",
          theme_icon: normalizeThemeIconName(theme.theme_icon ?? emptyTheme.theme_icon),
          theme_image_url: theme.theme_image_url ?? "",
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
      description_courte: form.description_courte || null,
      description_longue: form.description_longue || null,
      gradient_end: form.gradient_end,
      gradient_middle: form.gradient_middle,
      gradient_start: form.gradient_start,
      id: form.id || undefined,
      keywords: parseKeywords(form.keywords),
      name: form.name,
      seo_description: form.seo_description || null,
      seo_title: form.seo_title || null,
      theme_icon: normalizeThemeIconName(form.theme_icon || emptyTheme.theme_icon),
      theme_image_url: form.theme_image_url || null,
      tone: toneFromStops(form),
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push(`/admin/themes?${editing ? "updated" : "created"}=1`);
    router.refresh();

    if (!editing) {
      setForm(emptyTheme);
    }
  }

  async function uploadThemeImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setMessage(null);

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format invalide. Utilise JPG, PNG ou WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 5 Mo.");
      event.target.value = "";
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase n'est pas configuré pour l'upload.");
      event.target.value = "";
      return;
    }

    setUploadingImage(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
      const safeName = (form.name || "theme").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "theme";
      const path = `${safeName}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("theme-images")
        .upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("theme-images").getPublicUrl(path);
      setImagePreviewError(false);
      setForm((current) => ({
        ...current,
        theme_image_url: data.publicUrl,
      }));
      setMessage("Image importée.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  return (
    <>
      <AdminPageHeading
        current={editing ? "Modifier un thème" : "Créer un thème"}
        title={editing ? "Modifier un thème" : "Créer un thème"}
        description="Personnalisation éditoriale et visuelle du thème."
        action={<AdminBackLink href="/admin/themes">Retour aux thèmes</AdminBackLink>}
      />
      <AdminNotice message={message} />
      <AdminNotice message={error} tone="error" />

      <AdminCard className="p-6">
        {loading ? (
          <div className="h-72 animate-pulse rounded-2xl bg-gray-100" />
        ) : (
          <form onSubmit={submitTheme} className="grid gap-6">
            <section className="grid gap-5">
              <AdminField
                label="Nom"
                required
                value={form.name}
                onChange={(name) =>
                  setForm((current) => ({ ...current, name }))
                }
              />
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Couleurs du thème
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {gradientPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyGradientPreset(preset)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-[#465fff]/40 hover:bg-[#f5f7ff]"
                    >
                      <span
                        className="h-4 w-8 rounded-full border border-white shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${preset.colors.join(", ")})`,
                        }}
                      />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                {[
                  ["gradient_start", "Couleur 1"],
                  ["gradient_middle", "Couleur 2"],
                  ["gradient_end", "Couleur 3"],
                  ["accent_color", "Couleur d'accent"],
                ].map(([field, label]) => (
                  <label
                    key={field}
                    className="block text-xs font-medium text-gray-600"
                  >
                    {label}
                    <input
                      type="color"
                      value={form[field as "gradient_start" | "gradient_middle" | "gradient_end" | "accent_color"]}
                      onChange={(event) =>
                        updateColor(
                          field as "gradient_start" | "gradient_middle" | "gradient_end" | "accent_color",
                          event.target.value,
                        )
                      }
                      className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-gray-200 bg-white p-1"
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className="grid gap-5">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-800">
                  Prévisualisation du thème
                </p>
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/40 shadow-sm">
                  <div
                    className="min-h-44 p-5 text-white"
                    style={getThemeGradientStyle(previewTheme)}
                  >
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                      style={{
                        backgroundColor: `${form.accent_color}22`,
                        border: `1px solid ${form.accent_color}55`,
                      }}
                    >
                      {form.name || "Thème"}
                    </span>
                    <div
                      className="mt-6 grid h-16 w-16 place-items-center rounded-2xl border border-white/18 bg-black/20 shadow-[0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur"
                      style={{ color: form.accent_color }}
                    >
                      <ThemeIcon iconName={form.theme_icon} className="h-8 w-8" />
                    </div>
                    <h3 className="mt-7 max-w-xs text-2xl font-semibold leading-tight">
                      {form.name || "Exemple de carte Grumm."}
                    </h3>
                    <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">
                      {form.description_courte ||
                        "Le contraste doit rester lisible sur le fond choisi."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <IconPicker
              accent={form.accent_color}
              help="Icône Lucide utilisée pour identifier visuellement le thème dans les interfaces publiques."
              label="Icône du thème"
              value={form.theme_icon}
              onChange={(theme_icon) =>
                setForm((current) => ({ ...current, theme_icon }))
              }
            />

            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    Illustration du thème
                    <AdminHelpTooltip text="Image utilisée dans l'app iOS pour les cartes de thèmes. Formats acceptés : JPG, PNG, WEBP, 5 Mo maximum." />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Colle une URL ou importe une image depuis ton ordinateur.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImagePreviewError(false);
                    setForm((current) => ({ ...current, theme_image_url: "" }));
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
                >
                  Supprimer l&apos;image
                </button>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                  {form.theme_image_url && !imagePreviewError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={`Aperçu ${form.name || "du thème"}`}
                      src={form.theme_image_url}
                      onError={() => setImagePreviewError(true)}
                      className="h-36 w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-36 place-items-center bg-[linear-gradient(135deg,#111C2D,#132238)] px-6 text-center text-xs font-medium text-white/70">
                      Fallback image thème
                    </div>
                  )}
                </div>

                <div className="grid gap-4">
                  <AdminField
                    help="URL publique ou signée. Maximum 1000 caractères."
                    label="URL de l'image"
                    type="url"
                    value={form.theme_image_url}
                    onChange={(theme_image_url) => {
                      setImagePreviewError(false);
                      setForm((current) => ({
                        ...current,
                        theme_image_url: theme_image_url.slice(0, 1000),
                      }));
                    }}
                  />
                  <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-center text-sm text-gray-600 transition hover:border-[#465fff]/50 hover:bg-[#f5f7ff]">
                    <span className="font-medium text-gray-800">
                      {uploadingImage ? "Import en cours..." : "Importer une image"}
                    </span>
                    <span className="mt-1 text-xs text-gray-500">
                      JPG, PNG ou WEBP · 5 Mo max
                    </span>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={uploadingImage}
                      type="file"
                      onChange={uploadThemeImage}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <AdminField
                help="Titre affiché dans Google et dans les aperçus de partage."
                label="Titre SEO"
                value={form.seo_title}
                onChange={(seo_title) =>
                  setForm((current) => ({ ...current, seo_title }))
                }
              />
              <AdminField
                help="Résumé affiché dans les résultats de recherche."
                label="Description SEO"
                textarea
                rows={3}
                value={form.seo_description}
                onChange={(seo_description) =>
                  setForm((current) => ({ ...current, seo_description }))
                }
              />
              <AdminField
                help="Liste de mots-clés séparés par des virgules. Utilisés pour améliorer le référencement."
                label="Mots-clés"
                value={form.keywords}
                onChange={(keywords) =>
                  setForm((current) => ({ ...current, keywords }))
                }
              />
            </section>

            <section className="grid gap-5">
              <AdminField
                help="Texte affiché dans les cards de thème et certaines présentations publiques."
                label="Description courte"
                value={form.description_courte}
                onChange={(description_courte) =>
                  setForm((current) => ({ ...current, description_courte }))
                }
              />
              <AdminField
                help="Texte utilisé dans la page du thème et dans son contenu éditorial."
                label="Description longue"
                textarea
                rows={4}
                value={form.description_longue}
                onChange={(description_longue) =>
                  setForm((current) => ({ ...current, description_longue }))
                }
              />
            </section>

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
