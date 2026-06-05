"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  deleteAdminCategory,
  getAdminCategory,
  type AdminCategory,
} from "@/lib/admin";
import ThemeIcon from "../../../components/ThemeIcon";
import { AdminBackLink } from "../../forms";
import {
  AdminAttributeList,
  AdminAttributeRow,
  AdminCard,
  AdminNotice,
  AdminPageHeading,
  AdminTableSkeleton,
} from "../../ui";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DetailItem({
  label,
  technicalName,
  value,
}: {
  label: string;
  technicalName?: string;
  value: React.ReactNode;
}) {
  return <AdminAttributeRow label={label} technicalName={technicalName} value={value} />;
}

export default function AdminThemeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [theme, setTheme] = useState<AdminCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadTheme = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setTheme(await getAdminCategory(params.id));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Ce thème ne peut pas être chargé.",
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadTheme();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadTheme]);

  async function removeTheme() {
    if (!theme || !window.confirm(`Supprimer le thème "${theme.name}" ?`)) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteAdminCategory(theme.id);

    setDeleting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push("/admin/themes?deleted=1");
    router.refresh();
  }

  return (
    <>
      <AdminPageHeading
        current="Thème"
        title={theme?.name ? "Détail du thème" : "Thème"}
        description="Consultation de la catégorie dans l'espace d'administration."
        action={
          <div className="flex flex-wrap gap-3">
            <AdminBackLink href="/admin/themes">Retour aux thèmes</AdminBackLink>
            {theme ? (
              <Link
                href={`/admin/themes/${theme.id}/edit`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#3641f5]"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Modifier
              </Link>
            ) : null}
          </div>
        }
      />
      <AdminNotice message={error} tone="error" />

      {loading ? (
        <AdminTableSkeleton />
      ) : !theme ? (
        <AdminCard className="p-6 text-sm text-gray-500">
          Aucun thème ne correspond à cette fiche.
        </AdminCard>
      ) : (
        <AdminCard className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                {theme.theme_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    src={theme.theme_image_url}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="grid h-full w-full place-items-center"
                    style={{ backgroundColor: theme.accent_color }}
                  >
                    <ThemeIcon iconName={theme.theme_icon} className="h-7 w-7 text-white" />
                  </span>
                )}
                {theme.theme_image_url ? (
                  <span
                    className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-lg border border-white/40 bg-black/36 text-white backdrop-blur"
                    style={{ color: theme.accent_color }}
                  >
                    <ThemeIcon iconName={theme.theme_icon} className="h-4 w-4" />
                  </span>
                ) : null}
              </span>
              <div className="min-w-0">
                <h2 className="break-words text-2xl font-semibold text-gray-800">
                  {theme.name}
                </h2>
                <p className="mt-1 break-words text-sm text-gray-500">
                  {theme.slug}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeTheme}
              disabled={deleting}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Supprimer
            </button>
          </div>

          <AdminAttributeList className="mt-6">
            <DetailItem label="ID" value={theme.id} />
            <DetailItem label="Nom" technicalName="name" value={theme.name} />
            <DetailItem label="Slug" value={theme.slug} />
            <DetailItem
              label="Description courte"
              technicalName="description_courte"
              value={theme.description_courte ?? "-"}
            />
            <DetailItem
              label="Description longue"
              technicalName="description_longue"
              value={theme.description_longue ?? "-"}
            />
            <DetailItem
              label="Titre SEO"
              technicalName="seo_title"
              value={theme.seo_title ?? "-"}
            />
            <DetailItem
              label="Description SEO"
              technicalName="seo_description"
              value={theme.seo_description ?? "-"}
            />
            <DetailItem
              label="Mots-clés"
              technicalName="keywords"
              value={theme.keywords?.join(", ") || "-"}
            />
            <DetailItem
              label="Motif"
              technicalName="visual_motif"
              value={theme.visual_motif ?? "-"}
            />
            <DetailItem
              label="Icône"
              technicalName="theme_icon"
              value={
                <span className="inline-flex items-center gap-2">
                  <ThemeIcon iconName={theme.theme_icon} className="h-5 w-5" />
                  <span className="sr-only">{theme.theme_icon ?? "Aucune icône"}</span>
                </span>
              }
            />
            <DetailItem
              label="Illustration du thème"
              technicalName="theme_image_url"
              value={theme.theme_image_url ?? "-"}
            />
            <DetailItem
              label="Couleur d'accent"
              technicalName="accent_color"
              value={theme.accent_color}
            />
            <DetailItem
              label="Couleurs du gradient"
              value={[
                theme.gradient_start,
                theme.gradient_middle,
                theme.gradient_end,
              ].filter(Boolean).join(" -> ") || theme.tone}
            />
            <DetailItem
              label="Créé le"
              technicalName="created_at"
              value={formatDate(theme.created_at)}
            />
            <DetailItem
              label="Édité le"
              technicalName="updated_at"
              value={formatDate(theme.updated_at)}
            />
          </AdminAttributeList>
        </AdminCard>
      )}
    </>
  );
}
