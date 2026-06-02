"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminUserDetail,
  getAllAdminRoles,
  updateProfileRole,
  type AdminRole,
  type AdminUserDetail,
} from "@/lib/admin";
import { getRoleLabel } from "@/lib/roles";
import { AdminBackLink, adminFieldClassName } from "../forms";
import {
  AdminButton,
  AdminCard,
  AdminNotice,
  AdminPageHeading,
  AdminTableSkeleton,
} from "../ui";

export default function UserEditor({ userId }: { userId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextDetail, nextRoles] = await Promise.all([
        getAdminUserDetail(userId),
        getAllAdminRoles(),
      ]);

      setDetail(nextDetail);
      setRoles(nextRoles);
      setRole(nextDetail?.profile.role ?? "");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Cet utilisateur ne peut pas être chargé.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadUser();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadUser]);

  async function saveRole() {
    if (!detail || !role) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await updateProfileRole(detail.profile.id, role);

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push("/admin/users?updated=1");
    router.refresh();
  }

  const profile = detail?.profile;

  return (
    <>
      <AdminPageHeading
        current="Modifier un utilisateur"
        title={profile ? `Modifier ${profile.username}` : "Modifier un utilisateur"}
        description="Ajuste les attributs administrables du compte."
        action={<AdminBackLink href={`/admin/users/${userId}`}>Retour à la fiche</AdminBackLink>}
      />
      <AdminNotice message={message} />
      <AdminNotice message={error} tone="error" />

      {loading ? (
        <AdminTableSkeleton />
      ) : !detail || !profile ? (
        <AdminCard className="p-6 text-sm text-gray-500">
          Aucun utilisateur ne correspond à cette fiche.
        </AdminCard>
      ) : (
        <AdminCard className="p-6">
          <p className="text-sm text-gray-500">
            Rôle actuel :{" "}
            <span className="font-medium text-gray-800">
              {getRoleLabel(profile.role, detail.roleName)}
            </span>
          </p>
          <label className="mt-5 block max-w-xl text-sm font-medium text-gray-700">
            Rôle attribué
            <span className="ml-1 text-red-500" aria-label="obligatoire">
              *
            </span>
            <select
              required
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className={adminFieldClassName}
            >
              {roles.map((availableRole) => (
                <option key={availableRole.slug} value={availableRole.slug}>
                  {availableRole.name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <AdminButton onClick={saveRole} disabled={busy}>
              Enregistrer le rôle
            </AdminButton>
            <AdminBackLink href={`/admin/users/${userId}`}>Annuler</AdminBackLink>
          </div>
        </AdminCard>
      )}
    </>
  );
}
