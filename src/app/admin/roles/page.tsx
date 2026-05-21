"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteAdminRole, getAdminRoles } from "@/lib/admin";
import type { AdminRole } from "@/lib/admin";
import { hasPermission, PERMISSION_LABELS } from "@/lib/roles";
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

function rolePermissions(role: AdminRole) {
  return Array.isArray(role.permissions)
    ? role.permissions.filter((permission): permission is string => typeof permission === "string")
    : [];
}

export default function AdminRolesPage() {
  const { profile } = useAuth();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManageRoles = hasPermission(profile, "roles.manage");

  async function loadRoles(nextPage = page) {
    setIsLoading(true);

    try {
      const result = await getAdminRoles({ page: nextPage, pageSize, query });
      setRoles(result.items);
      setTotal(result.total);
      setPage(result.page);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les rôles.",
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

    async function loadInitialRoles() {
      try {
        const result = await getAdminRoles({ page, pageSize, query });

        if (!isMounted) {
          return;
        }

        setRoles(result.items);
        setTotal(result.total);
        setPage(result.page);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les rôles.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialRoles();

    return () => {
      isMounted = false;
    };
  }, [canManageRoles, page, pageSize, query]);

  async function removeRole(role: AdminRole) {
    if (!window.confirm(`Supprimer le rôle "${role.name}" ?`)) {
      return;
    }

    setIsBusy(true);
    setMessage(null);
    setError(null);

    const result = await deleteAdminRole(role.slug);

    setIsBusy(false);
    setMessage(result.ok ? result.message : null);
    setError(result.ok ? null : result.message);
    await loadRoles();
  }

  if (!canManageRoles) {
    return (
      <AdminPageHeader
        eyebrow="Rôles"
        title="Accès réservé"
        description="La gestion des rôles est réservée aux administrateurs."
      />
    );
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Sécurité"
        title="Rôles et permissions"
        description="Rôles applicatifs configurables. Les permissions sont aussi vérifiées par les fonctions et les politiques de sécurité."
        action={
          <Link
            href="/admin/roles/create"
            className="rounded-md bg-[#465fff] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#3641f5]"
          >
            Créer un rôle
          </Link>
        }
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
            placeholder="Rechercher un rôle..."
          />
          <span className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-slate-300">
            {total} rôles
          </span>
        </div>

        {isLoading ? (
          <AdminLoadingRows />
        ) : roles.length > 0 ? (
          <div className="divide-y divide-slate-800">
            {roles.map((role) => {
              const permissions = rolePermissions(role);

              return (
                <div
                  key={role.slug}
                  className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-extrabold text-white">{role.name}</h2>
                      {role.is_system && (
                        <span className="rounded bg-[#465fff]/10 px-2 py-1 text-xs font-bold text-[#bfdbfe]">
                          systeme
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{role.slug}</p>
                    {role.description && (
                      <p className="mt-2 text-sm text-slate-400">
                        {role.description}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {permissions.slice(0, 6).map((permission) => (
                        <span
                          key={permission}
                          className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-slate-300"
                        >
                          {PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS] ??
                            permission}
                        </span>
                      ))}
                      {permissions.length > 6 && (
                        <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-slate-500">
                          +{permissions.length - 6}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-start justify-end gap-2">
                    <Link
                      href={`/admin/roles/${role.slug}`}
                      className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
                    >
                      Modifier
                    </Link>
                    {!role.is_system && (
                      <AdminButton
                        tone="danger"
                        disabled={isBusy}
                        onClick={() => removeRole(role)}
                      >
                        Supprimer
                      </AdminButton>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4">
            <AdminTableEmpty label="Aucun rôle trouvé." />
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
