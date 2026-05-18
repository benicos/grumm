"use client";

import { useEffect, useState } from "react";
import { getAdminProfiles, updateProfileRole } from "@/lib/admin";
import type { AdminProfile } from "@/lib/admin";
import { isAdmin, ROLE_LABELS, USER_ROLES } from "@/lib/roles";
import type { UserRole } from "@/lib/roles";
import { useAuth } from "../../auth/AuthProvider";
import {
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
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManageUsers = isAdmin(profile?.role);

  async function loadProfiles(nextPage = page, nextQuery = query) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAdminProfiles({
        page: nextPage,
        pageSize,
        query: nextQuery,
      });
      setProfiles(result.items);
      setTotal(result.total);
      setPage(result.page);
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
        const result = await getAdminProfiles({ page, pageSize, query });

        if (!isMounted) {
          return;
        }

        setProfiles(result.items);
        setTotal(result.total);
        setPage(result.page);
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
  }, [canManageUsers, page, pageSize, query]);

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

  if (!canManageUsers) {
    return (
      <AdminPageHeader
        eyebrow="Utilisateurs"
        title="Acces reserve"
        description="La gestion des utilisateurs est reservee aux administrateurs."
      />
    );
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Comptes"
        title="Utilisateurs"
        description="Consulte les profils et modifie les roles sans exposer les donnees sensibles d'authentification."
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <AdminPanel>
        <div className="grid gap-3 border-b border-slate-800 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <AdminSearch
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
              setIsLoading(true);
            }}
            placeholder="Rechercher un pseudo..."
          />
          <span className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-slate-300">
            {total} utilisateurs
          </span>
        </div>

        {isLoading ? (
          <AdminLoadingRows />
        ) : profiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/70 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Pseudo</th>
                  <th className="px-4 py-3">Objectif</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Creation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {profiles.map((userProfile) => (
                  <tr key={userProfile.id}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">{userProfile.username}</p>
                      <p className="mt-1 text-xs text-slate-500">{userProfile.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {userProfile.daily_goal}/jour
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={userProfile.role}
                        disabled={isBusy}
                        onChange={(event) =>
                          changeRole(userProfile.id, event.target.value as UserRole)
                        }
                        className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-300"
                      >
                        {USER_ROLES.map((roleItem) => (
                          <option key={roleItem} value={roleItem}>
                            {ROLE_LABELS[roleItem]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(userProfile.created_at).toLocaleDateString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <AdminTableEmpty label="Aucun utilisateur trouve." />
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
