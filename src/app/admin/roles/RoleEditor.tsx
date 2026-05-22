"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { getAdminRole, saveAdminRole } from "@/lib/admin";
import {
  PERMISSION_LABELS,
  PERMISSIONS,
  type PermissionKey,
} from "@/lib/roles";
import { AdminBackLink, AdminField } from "../forms";
import {
  AdminButton,
  AdminCard,
  AdminNotice,
  AdminPageHeading,
} from "../ui";

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
  const [systemRole, setSystemRole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(roleSlug));
  const [busy, setBusy] = useState(false);
  const editing = Boolean(roleSlug);

  useEffect(() => {
    if (!roleSlug) {
      return;
    }

    const currentRoleSlug = roleSlug;
    let mounted = true;

    async function loadRole() {
      try {
        const role = await getAdminRole(currentRoleSlug);

        if (!mounted) {
          return;
        }

        if (!role) {
          setError("Ce rôle est introuvable.");
          return;
        }

        setForm({
          description: role.description ?? "",
          name: role.name,
          permissions: Array.isArray(role.permissions)
            ? (role.permissions.filter(
                (permission): permission is PermissionKey =>
                  typeof permission === "string" &&
                  PERMISSIONS.includes(permission as PermissionKey),
              ) as PermissionKey[])
            : [],
          slug: role.slug,
        });
        setSystemRole(role.is_system);
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Le rôle ne peut pas être chargé.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadRole();

    return () => {
      mounted = false;
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
    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await saveAdminRole(form);

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);

    if (!editing) {
      setForm(emptyRole);
    }
  }

  return (
    <>
      <AdminPageHeading
        current={editing ? "Modifier un rôle" : "Créer un rôle"}
        title={editing ? "Modifier un rôle" : "Créer un rôle"}
        description="Permissions utilisées par l’administration et les politiques Supabase."
        action={<AdminBackLink href="/admin/roles">Retour aux rôles</AdminBackLink>}
      />
      <AdminNotice message={message} />
      <AdminNotice message={error} tone="error" />

      <AdminCard className="p-6">
        {loading ? (
          <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
        ) : (
          <form onSubmit={submitRole} className="grid gap-5">
            {systemRole ? (
              <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Rôle système : vérifie les permissions critiques avant
                d’enregistrer.
              </p>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2">
              <AdminField
                label="Nom"
                value={form.name}
                onChange={(name) =>
                  setForm((current) => ({ ...current, name }))
                }
              />
              <AdminField
                label="Identifiant"
                value={form.slug}
                onChange={(slug) =>
                  setForm((current) => ({ ...current, slug }))
                }
              />
            </div>
            <AdminField
              label="Description"
              textarea
              rows={3}
              value={form.description}
              onChange={(description) =>
                setForm((current) => ({ ...current, description }))
              }
            />

            <section>
              <h2 className="text-sm font-medium text-gray-700">
                Permissions
              </h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {PERMISSIONS.map((permission) => (
                  <label
                    key={permission}
                    className="flex min-h-14 items-center gap-3 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(permission)}
                      onChange={() => togglePermission(permission)}
                      className="h-4 w-4 shrink-0 accent-[#465fff]"
                    />
                    <span>{PERMISSION_LABELS[permission]}</span>
                  </label>
                ))}
              </div>
            </section>

            <div className="flex flex-wrap gap-3">
              <AdminButton type="submit" disabled={busy}>
                Enregistrer
              </AdminButton>
              <AdminBackLink href="/admin/roles">Annuler</AdminBackLink>
            </div>
          </form>
        )}
      </AdminCard>
    </>
  );
}
