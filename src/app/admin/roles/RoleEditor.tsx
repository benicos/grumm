"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  getAdminRole,
  saveAdminRole,
} from "@/lib/admin";
import {
  PERMISSION_LABELS,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/roles";
import {
  AdminButton,
  AdminMessage,
  AdminPageHeader,
  AdminPanel,
} from "../components";

type RoleFormState = {
  description: string;
  name: string;
  permissions: PermissionKey[];
  slug: string;
};

const emptyRole: RoleFormState = {
  description: "",
  name: "",
  permissions: ["admin.access"],
  slug: "",
};

export default function RoleEditor({ roleSlug }: { roleSlug?: string }) {
  const [form, setForm] = useState<RoleFormState>(emptyRole);
  const [isSystem, setIsSystem] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(roleSlug));
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(roleSlug);

  useEffect(() => {
    if (!roleSlug) {
      return;
    }

    const currentRoleSlug = roleSlug;
    let isMounted = true;

    async function loadRole() {
      try {
        const role = await getAdminRole(currentRoleSlug);

        if (isMounted && role) {
          setForm({
            description: role.description ?? "",
            name: role.name,
            permissions: Array.isArray(role.permissions)
              ? (role.permissions.filter(
                  (permission): permission is PermissionKey =>
                    typeof permission === "string",
                ) as PermissionKey[])
              : [],
            slug: role.slug,
          });
          setIsSystem(role.is_system);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger le role.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRole();

    return () => {
      isMounted = false;
    };
  }, [roleSlug]);

  function togglePermission(permission: PermissionKey) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage(null);
    setError(null);

    const result = await saveAdminRole(form);

    setIsBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);

    if (!isEditing) {
      setForm(emptyRole);
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Securite"
        title={isEditing ? "Modifier un role" : "Creer un role"}
        description="Les permissions cochees sont utilisees par l'admin et les policies Supabase."
        action={
          <Link
            href="/admin/roles"
            className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
          >
            Retour aux roles
          </Link>
        }
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <AdminPanel className="p-5">
        {isLoading ? (
          <div className="h-96 animate-pulse rounded-md bg-slate-900" />
        ) : (
          <form onSubmit={submitRole} className="grid gap-5">
            {isSystem && (
              <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
                Role systeme protege. Le role administrateur doit conserver les permissions critiques.
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-300">Nom</span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-300">
                  Identifiant
                </span>
                <input
                  value={form.slug}
                  disabled={isSystem}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, slug: event.target.value }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300 disabled:opacity-60"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-slate-300">Description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="mt-2 min-h-24 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
              />
            </label>

            <div>
              <p className="text-sm font-bold text-slate-300">Permissions</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PERMISSIONS.map((permission) => (
                  <label
                    key={permission}
                    className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-900 px-3 py-3 text-sm text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                      className="h-4 w-4 accent-amber-300"
                    />
                    <span>{PERMISSION_LABELS[permission]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <AdminButton type="submit" disabled={isBusy}>
                Enregistrer
              </AdminButton>
              <Link
                href="/admin/roles"
                className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
              >
                Annuler
              </Link>
            </div>
          </form>
        )}
      </AdminPanel>
    </>
  );
}
