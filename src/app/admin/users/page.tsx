"use client";

import { useRouter } from "next/navigation";
import { deleteAdminUser, getAdminProfiles, type AdminProfile } from "@/lib/admin";
import AdminListingPage from "../AdminListingPage";

function loadUsers({
  page,
  pageSize,
  query,
}: {
  page: number;
  pageSize: number;
  query: string;
}) {
  return getAdminProfiles({ page, pageSize, query });
}

export default function AdminUsersPage() {
  const router = useRouter();

  return (
    <AdminListingPage<AdminProfile>
      current="Utilisateurs"
      entity="users"
      title="Utilisateurs"
      description="Comptes, rôles et objectifs quotidiens."
      actionLabel="Ajouter un utilisateur"
      searchPlaceholder="Rechercher des utilisateurs..."
      empty="Aucun utilisateur trouvé."
      loadRows={loadUsers}
      rowKey={(user) => user.id}
      actions={{
        onDelete: (user) => {
          if (window.confirm(`Supprimer l'utilisateur "${user.username}" ?`)) {
            void deleteAdminUser(user.id).then(() => router.refresh());
          }
        },
        onEdit: (user) => router.push(`/admin/users/${user.id}`),
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
