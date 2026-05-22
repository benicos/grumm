"use client";

import { useParams } from "next/navigation";
import { Activity, BookOpen, Heart, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  getAdminUserDetail,
  getAllAdminRoles,
  updateProfileRole,
  type AdminRole,
  type AdminUserDetail,
} from "@/lib/admin";
import { getRoleLabel } from "@/lib/roles";
import { AdminBackLink, adminFieldClassName } from "../../forms";
import {
  AdminButton,
  AdminCard,
  AdminMetricCard,
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

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
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
        getAdminUserDetail(params.id),
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
  }, [params.id]);

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

    setMessage(result.message);
    await loadUser();
  }

  const profile = detail?.profile;

  return (
    <>
      <AdminPageHeading
        current="Utilisateur"
        title={profile?.username ?? "Utilisateur"}
        description="Profil, progression et rôle du compte."
        action={<AdminBackLink href="/admin/users">Retour aux utilisateurs</AdminBackLink>}
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
        <>
          <AdminCard className="p-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div>
                <div className="flex items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#ecf3ff] text-xl font-semibold text-[#465fff]">
                    {profile.username.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      {profile.username}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {profile.email ?? "Adresse email non disponible"}
                    </p>
                  </div>
                </div>
                <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-gray-500">Inscription</dt>
                    <dd className="mt-1 font-medium text-gray-800">
                      {formatDate(profile.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Rôle</dt>
                    <dd className="mt-1 font-medium text-gray-800">
                      {getRoleLabel(profile.role, detail.roleName)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Objectif quotidien</dt>
                    <dd className="mt-1 font-medium text-gray-800">
                      {profile.daily_goal} faits
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-2xl border border-gray-200 p-4">
                <label className="block text-sm font-medium text-gray-700">
                  Rôle attribué
                  <select
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
                <AdminButton onClick={saveRole} disabled={busy}>
                  Enregistrer le rôle
                </AdminButton>
              </div>
            </div>
          </AdminCard>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard
              icon={BookOpen}
              label="Faits lus"
              meta="Lecture"
              value={detail.stats.viewedFacts}
            />
            <AdminMetricCard
              icon={Heart}
              label="Faits aimés"
              meta="Interaction"
              value={detail.stats.likedFacts}
            />
            <AdminMetricCard
              icon={Target}
              label="Objectifs atteints"
              meta="Progression"
              value={detail.stats.completedGoals}
            />
            <AdminMetricCard
              icon={Activity}
              label="Interactions"
              meta="Activité"
              value={detail.stats.interactions}
            />
          </div>
        </>
      )}
    </>
  );
}
