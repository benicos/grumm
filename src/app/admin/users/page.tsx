"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  deleteAdminUser,
  getAdminProfiles,
  getAllAdminRoles,
  type AdminProfile,
  type AdminRole,
} from "@/lib/admin";
import AdminListingPage, {
  type AdminListingFilterValues,
} from "../AdminListingPage";

function loadUsers({
  page,
  pageSize,
  query,
  filters,
}: {
  filters: AdminListingFilterValues;
  page: number;
  pageSize: number;
  query: string;
}) {
  return getAdminProfiles({ page, pageSize, query, role: filters.role });
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<AdminRole[]>([]);

  useEffect(() => {
    let mounted = true;

    void getAllAdminRoles()
      .then((nextRoles) => {
        if (mounted) {
          setRoles(nextRoles);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AdminListingPage<AdminProfile>
      current="Utilisateurs"
      entity="users"
      title="Utilisateurs"
      description="Comptes, rôles et objectifs quotidiens."
      actionLabel="Ajouter un utilisateur"
      searchPlaceholder="Rechercher des utilisateurs..."
      filters={[
        {
          id: "role",
          label: "Rôle",
          options: [
            { label: "Tous les rôles", value: "all" },
            ...roles.map((role) => ({
              label: role.name,
              value: role.slug,
            })),
          ],
        },
      ]}
      empty="Aucun utilisateur trouvé."
      loadRows={loadUsers}
      rowKey={(user) => user.id}
      actions={{
        onDelete: (user) => {
          if (window.confirm(`Supprimer l'utilisateur "${user.username}" ?`)) {
            void deleteAdminUser(user.id).then(() => router.refresh());
          }
        },
        onEdit: (user) => router.push(`/admin/users/${user.id}/edit`),
        onView: (user) => router.push(`/admin/users/${user.id}`),
      }}
      columns={[
        {
          key: "user",
          label: "Utilisateur",
          render: (user) => (
            <div>
              <p className="font-medium text-gray-800">{user.username}</p>
              <p className="mt-1 text-xs text-gray-500">
                {user.email ?? user.id}
              </p>
            </div>
          ),
        },
        {
          key: "role",
          label: "Rôle",
          render: (user) => user.role,
        },
        {
          key: "goal",
          label: "Objectif quotidien",
          render: (user) => user.daily_goal,
        },
        {
          key: "created",
          label: "Inscription",
          render: (user) =>
            new Date(user.created_at).toLocaleDateString("fr-FR"),
        },
      ]}
    />
  );
}
