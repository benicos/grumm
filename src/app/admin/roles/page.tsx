"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAdminProfiles, updateProfileRole } from "@/lib/admin";
import type { AdminProfile } from "@/lib/admin";
import { isAdmin, ROLE_LABELS, USER_ROLES } from "@/lib/roles";
import type { UserRole } from "@/lib/roles";
import { useAuth } from "../../auth/AuthProvider";
import {
  AdminButton,
  AdminLoadingRows,
  AdminMessage,
  AdminPageHeader,
  AdminPanel,
} from "../components";

const permissions = [
  {
    role: "membre",
    rows: ["Lire les contenus", "Liker et sauvegarder", "Gerer son profil"],
  },
  {
    role: "redacteur",
    rows: ["Permissions membre", "Creer des faits", "Modifier ses propres faits"],
  },
  {
    role: "administrateur",
    rows: ["Acces admin complet", "CRUD faits/themes", "Gestion utilisateurs et roles"],
  },
] as const;

export default function AdminRolesPage() {
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManageRoles = isAdmin(profile?.role);

  async function loadProfiles() {
    setIsLoading(true);

    try {
      const result = await getAdminProfiles({ pageSize: 8 });
      setProfiles(result.items);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les roles.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!canManageRoles) {
      return;
    }

    let isMounted = true;

    async function loadInitialProfiles() {
      try {
        const result = await getAdminProfiles({ pageSize: 8 });

        if (isMounted) {
          setProfiles(result.items);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les roles.",
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
  }, [canManageRoles]);

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

  if (!canManageRoles) {
    return (
      <AdminPageHeader
        eyebrow="Roles"
        title="Acces reserve"
        description="La gestion des roles est reservee aux administrateurs."
      />
    );
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Securite"
        title="Roles et permissions"
        description="Vue claire des droits applicatifs. Les permissions critiques restent enforcees par Supabase RLS."
        action={
          <Link
            href="/admin/users"
            className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
          >
            Tous les utilisateurs
          </Link>
        }
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="grid gap-4 md:grid-cols-3">
          {permissions.map((item) => (
            <AdminPanel key={item.role} className="p-5">
              <h2 className="text-lg font-extrabold text-white">
                {ROLE_LABELS[item.role]}
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {item.rows.map((row) => (
                  <li key={row} className="rounded-md bg-slate-900 px-3 py-2">
                    {row}
                  </li>
                ))}
              </ul>
            </AdminPanel>
          ))}
        </section>

        <AdminPanel>
          <div className="border-b border-slate-800 px-5 py-4">
            <h2 className="text-lg font-extrabold">Attribution rapide</h2>
          </div>

          {isLoading ? (
            <AdminLoadingRows rows={4} />
          ) : (
            <div className="divide-y divide-slate-800">
              {profiles.map((userProfile) => (
                <div
                  key={userProfile.id}
                  className="flex items-center justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">
                      {userProfile.username}
                    </p>
                    <p className="text-xs text-slate-500">{userProfile.role}</p>
                  </div>
                  <select
                    value={userProfile.role}
                    disabled={isBusy}
                    onChange={(event) =>
                      changeRole(userProfile.id, event.target.value as UserRole)
                    }
                    className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-bold text-white"
                  >
                    {USER_ROLES.map((roleItem) => (
                      <option key={roleItem} value={roleItem}>
                        {ROLE_LABELS[roleItem]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-800 p-4">
            <AdminButton tone="secondary" onClick={loadProfiles}>
              Rafraichir
            </AdminButton>
          </div>
        </AdminPanel>
      </div>
    </>
  );
}
