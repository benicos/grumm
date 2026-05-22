"use client";

import { useRouter } from "next/navigation";
import { deleteAdminRole, getAdminRoles, type AdminRole } from "@/lib/admin";
import AdminListingPage from "../AdminListingPage";

function loadRoles({
  page,
  pageSize,
  query,
}: {
  page: number;
  pageSize: number;
  query: string;
}) {
  return getAdminRoles({ page, pageSize, query });
}

export default function AdminRolesPage() {
  const router = useRouter();

  return (
    <AdminListingPage<AdminRole>
      current="Rôles"
      entity="roles"
      title="Rôles"
      description="Rôles et permissions disponibles dans l’administration."
      actionLabel="Ajouter un rôle"
      actionHref="/admin/roles/create"
      searchPlaceholder="Rechercher des rôles..."
      empty="Aucun rôle trouvé."
      loadRows={loadRoles}
      rowKey={(role) => role.slug}
      actions={{
        onDelete: (role) => {
          if (!role.is_system && window.confirm(`Supprimer le rôle "${role.name}" ?`)) {
            void deleteAdminRole(role.slug).then(() => router.refresh());
          }
        },
        onEdit: (role) => router.push(`/admin/roles/${role.slug}`),
        onView: (role) => router.push(`/admin/roles/${role.slug}`),
      }}
      columns={[
        {
          key: "role",
          label: "Rôle",
          render: (role) => (
            <div>
              <p className="font-medium text-gray-800">{role.name}</p>
              <p className="mt-1 text-xs text-gray-500">{role.slug}</p>
            </div>
          ),
        },
        {
          key: "type",
          label: "Type",
          render: (role) => (role.is_system ? "Système" : "Personnalisé"),
        },
        {
          key: "permissions",
          label: "Permissions",
          render: (role) =>
            Array.isArray(role.permissions) ? role.permissions.length : 0,
        },
        {
          key: "updated",
          label: "Mise à jour",
          render: (role) =>
            new Date(role.updated_at).toLocaleDateString("fr-FR"),
        },
      ]}
    />
  );
}
