"use client";

import { useRouter } from "next/navigation";
import {
  deleteAdminCategory,
  getAdminCategories,
  type AdminCategory,
} from "@/lib/admin";
import AdminListingPage from "../AdminListingPage";

function getThemePreviewBackground(theme: AdminCategory) {
  const colors = [
    theme.gradient_start,
    theme.gradient_middle,
    theme.gradient_end,
  ].filter(Boolean);

  if (colors.length >= 2) {
    return `linear-gradient(135deg, ${colors.join(", ")})`;
  }

  const toneColors = [...theme.tone.matchAll(/\[(#[0-9a-fA-F]{3,8})\]/g)]
    .map((match) => match[1])
    .filter(Boolean);

  if (toneColors.length >= 2) {
    return `linear-gradient(135deg, ${toneColors.join(", ")})`;
  }

  return `linear-gradient(135deg, #111827, ${theme.accent_color})`;
}

function loadThemes({
  page,
  pageSize,
  query,
}: {
  page: number;
  pageSize: number;
  query: string;
}) {
  return getAdminCategories({ page, pageSize, query });
}

export default function AdminThemesPage() {
  const router = useRouter();

  return (
    <AdminListingPage<AdminCategory>
      current="Thèmes"
      entity="themes"
      title="Thèmes"
      description="Catégories utilisées par la découverte et le flux."
      actionLabel="Ajouter un thème"
      actionHref="/admin/themes/create"
      searchPlaceholder="Rechercher des thèmes..."
      empty="Aucun thème trouvé."
      loadRows={loadThemes}
      rowKey={(theme) => theme.id}
      actions={{
        onDelete: (theme) => {
          if (window.confirm(`Supprimer le thème "${theme.name}" ?`)) {
            void deleteAdminCategory(theme.id).then((result) => {
              if (result.ok) {
                router.push("/admin/themes?deleted=1");
              }
              router.refresh();
            });
          }
        },
        onEdit: (theme) => router.push(`/admin/themes/${theme.id}/edit`),
        onView: (theme) => router.push(`/admin/themes/${theme.id}`),
      }}
      columns={[
        {
          key: "theme",
          label: "Thème",
          render: (theme) => (
            <div className="flex items-center gap-3">
              <span className="relative h-10 w-10 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                {theme.theme_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    src={theme.theme_image_url}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="block h-full w-full"
                    style={{ background: getThemePreviewBackground(theme) }}
                  />
                )}
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-gray-800">{theme.name}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                  <span
                    className="h-2.5 w-8 rounded-full border border-white shadow-sm"
                    style={{ background: getThemePreviewBackground(theme) }}
                  />
                  {theme.accent_color}
                </span>
              </span>
            </div>
          ),
        },
        {
          key: "slug",
          label: "Slug",
          render: (theme) => theme.slug,
        },
        {
          key: "accent",
          label: "Accent",
          render: (theme) => theme.accent_color,
        },
        {
          key: "updated",
          label: "Mise à jour",
          render: (theme) =>
            new Date(theme.updated_at).toLocaleDateString("fr-FR"),
        },
      ]}
    />
  );
}
