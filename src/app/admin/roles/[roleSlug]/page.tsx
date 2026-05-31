"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  deleteAdminRole,
  getAdminRole,
  type AdminRole,
} from "@/lib/admin";
import { AdminBackLink } from "../../forms";
import {
  AdminAttributeList,
  AdminAttributeRow,
  AdminCard,
  AdminNotice,
  AdminPageHeading,
  AdminTableSkeleton,
} from "../../ui";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPermissions(role: AdminRole) {
  if (!Array.isArray(role.permissions)) {
    return "-";
  }

  const permissions = role.permissions.filter(
    (permission): permission is string => typeof permission === "string",
  );

  return permissions.length > 0 ? permissions.join(", ") : "-";
}

export default function AdminRoleDetailPage() {
  const params = useParams<{ roleSlug: string }>();
  const router = useRouter();
  const [role, setRole] = useState<AdminRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadRole = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setRole(await getAdminRole(params.roleSlug));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Ce rôle ne peut pas être chargé.",
      );
    } finally {
      setLoading(false);
    }
  }, [params.roleSlug]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadRole();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadRole]);

  async function removeRole() {
    if (
      !role ||
      role.is_system ||
      !window.confirm(`Supprimer le rôle "${role.name}" ?`)
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteAdminRole(role.slug);

    setDeleting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push("/admin/roles?deleted=1");
    router.refresh();
  }

  return (
    <>
      <AdminPageHeading
        current="Rôle"
        title={role?.name ? "D?tail du r?le" : "R?le"}
        description="Consultation du rôle et de ses permissions."
        action={
          <div className="flex flex-wrap gap-3">
            <AdminBackLink href="/admin/roles">Retour aux rôles</AdminBackLink>
            {role ? (
              <Link
                href={`/admin/roles/${role.slug}/edit`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#3641f5]"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Modifier
              </Link>
            ) : null}
          </div>
        }
      />
      <AdminNotice message={error} tone="error" />

      {loading ? (
        <AdminTableSkeleton />
      ) : !role ? (
        <AdminCard className="p-6 text-sm text-gray-500">
          Aucun rôle ne correspond à cette fiche.
        </AdminCard>
      ) : (
        <AdminCard className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-3xl text-sm text-gray-500">
                  {role.description ?? "Aucune description renseign?e."}
            </p>
            {!role.is_system ? (
              <button
                type="button"
                onClick={removeRole}
                disabled={deleting}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Supprimer
              </button>
            ) : null}
          </div>
          <AdminAttributeList className="mt-6">
            <AdminAttributeRow label="Slug" value={role.slug} />
            <AdminAttributeRow label="Nom" technicalName="name" value={role.name} />
            <AdminAttributeRow
              label="Description"
              value={role.description ?? "-"}
            />
            <AdminAttributeRow
              label="Permissions"
              value={formatPermissions(role)}
            />
            <AdminAttributeRow
              label="Système"
              technicalName="is_system"
              value={role.is_system ? "Oui" : "Non"}
            />
            <AdminAttributeRow
              label="Créé le"
              technicalName="created_at"
              value={formatDate(role.created_at)}
            />
            <AdminAttributeRow
              label="Édité le"
              technicalName="updated_at"
              value={formatDate(role.updated_at)}
            />
          </AdminAttributeList>
        </AdminCard>
      )}
    </>
  );
}
