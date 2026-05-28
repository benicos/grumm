"use client";

import Link from "next/link";
import { Activity, BookOpen, Heart, Pencil, Target } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getAdminUserDetail, type AdminUserDetail } from "@/lib/admin";
import { getLearningGoalLabel } from "@/lib/learning";
import { getRoleLabel } from "@/lib/roles";
import { AdminBackLink } from "../../forms";
import {
  AdminAttributeList,
  AdminAttributeRow,
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setDetail(await getAdminUserDetail(params.id));
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

  const profile = detail?.profile;

  return (
    <>
      <AdminPageHeading
        current="Utilisateur"
        title={profile?.username ?? "Utilisateur"}
        description="Consultation du compte, du rôle et de la progression."
        action={
          <div className="flex flex-wrap gap-3">
            <AdminBackLink href="/admin/users">
              Retour aux utilisateurs
            </AdminBackLink>
            {profile ? (
              <Link
                href={`/admin/users/${profile.id}/edit`}
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
      ) : !detail || !profile ? (
        <AdminCard className="p-6 text-sm text-gray-500">
          Aucun utilisateur ne correspond à cette fiche.
        </AdminCard>
      ) : (
        <>
          <AdminCard className="p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#ecf3ff] text-xl font-semibold text-[#465fff]">
                {profile.username.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <h2 className="break-words text-xl font-semibold text-gray-800">
                  {profile.username}
                </h2>
                <p className="mt-1 break-words text-sm text-gray-500">
                  {profile.email ?? "Adresse email non disponible"}
                </p>
              </div>
            </div>

            <AdminAttributeList className="mt-6">
              <AdminAttributeRow label="ID" value={profile.id} />
              <AdminAttributeRow
                label="Nom utilisateur"
                technicalName="username"
                value={profile.username}
              />
              <AdminAttributeRow label="Email" value={profile.email ?? "-"} />
              <AdminAttributeRow
                label="Rôle"
                value={getRoleLabel(profile.role, detail.roleName)}
              />
              <AdminAttributeRow
                label="Objectif quotidien"
                technicalName="daily_goal"
                value={`${profile.daily_goal} faits`}
              />
              <AdminAttributeRow
                label="Objectif culturel"
                technicalName="learning_goal"
                value={getLearningGoalLabel(profile.learning_goal)}
              />
              <AdminAttributeRow
                label="URL avatar"
                technicalName="avatar_url"
                value={profile.avatar_url ?? "-"}
              />
              <AdminAttributeRow
                label="Créé le"
                technicalName="created_at"
                value={formatDate(profile.created_at)}
              />
              <AdminAttributeRow
                label="Édité le"
                technicalName="updated_at"
                value={formatDate(profile.updated_at)}
              />
            </AdminAttributeList>
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
