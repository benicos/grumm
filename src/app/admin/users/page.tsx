"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  deleteAdminUser,
  getAdminProfiles,
  getAllAdminRoles,
  updateProfileRole,
} from "@/lib/admin";
import type { AdminProfile, AdminRole } from "@/lib/admin";
import { getRoleLabel, hasPermission } from "@/lib/roles";
import type { UserRole } from "@/lib/roles";
import { useAuth } from "../../auth/AuthProvider";
import {
  AdminButton,
  AdminLoadingRows,
  AdminMessage,
  AdminPageHeader,
  AdminPager,
  AdminPanel,
  AdminSearch,
  AdminTableEmpty,
} from "../components";

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManageUsers = hasPermission(profile, "users.manage");
  const canDeleteUsers = hasPermission(profile, "users.delete");

  async function loadProfiles(nextPage = page) {
    setIsLoading(true);
    setError(null);

    try {
      const [profilesResult, rolesResult] = await Promise.all([
        getAdminProfiles({
          page: nextPage,
          pageSize,
          query,
          role: roleFilter,
        }),
        getAllAdminRoles(),
      ]);
      setProfiles(profilesResult.items);
      setRoles(rolesResult);
      setTotal(profilesResult.total);
      setPage(profilesResult.page);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les utilisateurs.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!canManageUsers) {
      return;
    }

    let isMounted = true;

    async function loadInitialProfiles() {
      try {
        const [profilesResult, rolesResult] = await Promise.all([
          getAdminProfiles({ page, pageSize, query, role: roleFilter }),
          getAllAdminRoles(),
        ]);

        if (!isMounted) {
          return;
        }

        setProfiles(profilesResult.items);
        setRoles(rolesResult);
        setTotal(profilesResult.total);
        setPage(profilesResult.page);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les utilisateurs.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialProfiles();

    return () => {
      isMounted = false;
    };
  }, [canManageUsers, page, pageSize, query, roleFilter]);

  async function changeRole(profileId: string, nextRole: UserRole) {
    setIsBusy(true);
    setMessage(null);
    setError(null);

    const result = await updateProfileRole(profileId, nextRole);

    setIsBusy(false);
    setMessage(result.ok ? result.message : null);
    setError(result.ok ? null : result.message);
    await loadProfiles();
  }

  async function removeUser(userProfile: AdminProfile) {
    const confirmed = window.confirm(
      `Supprimer définitivement ${userProfile.username} ? Likes, enregistrements, vues uniques, progression, objectifs et profil seront supprimés. Cette action est irréversible.`,
    );

    if (!confirmed) {
      return;
    }

    setIsBusy(true);
    setMessage(null);
    setError(null);

    const result = await deleteAdminUser(userProfile.id);

    setIsBusy(false);
    setMessage(result.ok ? result.message : null);
    setError(result.ok ? null : result.message);
    await loadProfiles();
  }

  if (!canManageUsers) {
    return (
      <AdminPageHeader
        eyebrow="Utilisateurs"
        title="Accès réservé"
        description="La gestion des utilisateurs est réservée aux administrateurs."
      />
    );
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Comptes"
        title="Utilisateurs"
        description="Recherche, filtre par rôle, attribution rapide et suppression propre des comptes."
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <AdminPanel>
        <div className="grid gap-3 border-b border-slate-800 p-4 md:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_220px_auto]">
          <AdminSearch
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
              setIsLoading(true);
            }}
            placeholder="Rechercher pseudo, email ou ID..."
          />
          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
              setIsLoading(true);
            }}
            className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm font-bold text-slate-200 outline-none focus:border-amber-300"
          >
            <option value="all">Tous les rôles</option>
            {roles.map((role) => (
              <option key={role.slug} value={role.slug}>
                {role.name}
              </option>
            ))}
          </select>
          <span className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-slate-300 md:col-span-2 xl:col-span-1">
            {total} utilisateurs
          </span>
        </div>

        {isLoading ? (
          <AdminLoadingRows />
        ) : profiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/70 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Objectif</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Creation</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {profiles.map((userProfile) => (
                  <tr key={userProfile.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">{userProfile.username}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {userProfile.email ?? userProfile.id}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {userProfile.daily_goal}/jour
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={userProfile.role}
                        disabled={isBusy}
                        onChange={(event) =>
                          changeRole(userProfile.id, event.target.value)
                        }
                        className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-300"
                      >
                        {roles.map((role) => (
                          <option key={role.slug} value={role.slug}>
                            {getRoleLabel(role.slug, role.name)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(userProfile.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/users/${userProfile.id}`}
                          className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 transition hover:bg-slate-800"
                        >
                          Voir
                        </Link>
                        {canDeleteUsers && (
                          <AdminButton
                            tone="danger"
                            disabled={isBusy}
                            onClick={() => removeUser(userProfile)}
                          >
                            Supprimer
                          </AdminButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <AdminTableEmpty label="Aucun utilisateur trouvé." />
          </div>
        )}

        <AdminPager
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            setIsLoading(true);
          }}
        />
      </AdminPanel>
    </>
  );
}
