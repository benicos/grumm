"use client";

import { useRouter } from "next/navigation";
import {
  deleteAdminCategory,
  getAdminCategories,
  type AdminCategory,
} from "@/lib/admin";
import AdminListingPage from "../AdminListingPage";

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
              <span
                className="h-9 w-9 rounded-lg border border-gray-200"
                style={{ backgroundColor: theme.accent_color }}
              />
              <span className="font-medium text-gray-800">{theme.name}</span>
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
