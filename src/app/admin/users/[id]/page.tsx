"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Activity, Bookmark, Eye, Flame, Heart, Layers3, Mail, Target } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getAdminUserDetail, type AdminUserDetail } from "@/lib/admin";
import { getRoleLabel } from "@/lib/roles";
import GradeIcon from "../../../components/GradeIcon";
import {
  AdminButton,
  AdminLoadingRows,
  AdminMessage,
  AdminPageHeader,
  AdminPanel,
} from "../../components";

const statIcons = {
  completedGoals: Target,
  currentStreak: Flame,
  interactions: Activity,
  likedFacts: Heart,
  savedFacts: Bookmark,
  viewedFacts: Eye,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatCard({
  label,
  value,
  tone = "slate",
  type,
}: {
  label: string;
  tone?: "amber" | "emerald" | "rose" | "slate";
  type: keyof typeof statIcons;
  value: number;
}) {
  const Icon = statIcons[type];
  const toneClass = {
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-200",
    emerald: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
    rose: "border-rose-300/20 bg-rose-300/10 text-rose-100",
    slate: "border-slate-700 bg-slate-900 text-slate-200",
  }[tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
      <div className={`grid h-10 w-10 place-items-center rounded-md border ${toneClass}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-5 text-3xl font-extrabold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-400">{label}</p>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setDetail(await getAdminUserDetail(params.id));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger cet utilisateur.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadUser();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadUser]);

  if (isLoading) {
    return (
      <>
        <AdminPageHeader
          eyebrow="Utilisateur"
          title="Chargement du profil"
          action={
            <Link href="/admin/users" className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800">
              Retour
            </Link>
          }
        />
        <AdminPanel>
          <AdminLoadingRows rows={8} />
        </AdminPanel>
      </>
    );
  }

  if (error || !detail) {
    return (
      <>
        <AdminPageHeader
          eyebrow="Utilisateur"
          title={detail ? "Profil indisponible" : "Utilisateur introuvable"}
          description="La fiche demandée n'a pas pu être affichée."
          action={
            <Link href="/admin/users" className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800">
              Retour
            </Link>
          }
        />
        <AdminMessage message={error ?? "Aucun utilisateur ne correspond à cette fiche."} tone="error" />
      </>
    );
  }

  const roleLabel = getRoleLabel(detail.profile.role, detail.roleName);
  const stats = detail.stats;

  return (
    <>
      <AdminPageHeader
        eyebrow="Utilisateur"
        title={detail.profile.username}
        description="Vue consolidée du profil, de la progression et des interactions."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminButton tone="secondary" onClick={loadUser}>
              Actualiser
            </AdminButton>
            <Link href="/admin/users" className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800">
              Retour
            </Link>
          </div>
        }
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <AdminPanel className="p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-lg bg-amber-300 text-xl font-black text-slate-950">
                    {detail.profile.username.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-2xl font-extrabold text-white">{detail.profile.username}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                      {detail.profile.email ?? "Email non disponible"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-amber-100">
                <div className="flex items-center gap-3">
                  <GradeIcon badge={detail.gradeBadge} className="h-6 w-6" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200/70">
                      Rang
                    </p>
                    <p className="font-extrabold">{detail.gradeName ?? roleLabel}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-slate-400 md:grid-cols-3">
              <p>
                <span className="font-bold text-slate-200">Inscription</span>
                <br />
                {formatDate(detail.profile.created_at)}
              </p>
              <p>
                <span className="font-bold text-slate-200">Rôle</span>
                <br />
                {roleLabel}
              </p>
              <p>
                <span className="font-bold text-slate-200">Objectif quotidien</span>
                <br />
                {detail.profile.daily_goal} faits
              </p>
            </div>
          </AdminPanel>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Faits vus" type="viewedFacts" value={stats.viewedFacts} />
            <StatCard label="Faits aimés" type="likedFacts" value={stats.likedFacts} tone="rose" />
            <StatCard label="Faits enregistrés" type="savedFacts" value={stats.savedFacts} tone="amber" />
            <StatCard label="Objectifs atteints" type="completedGoals" value={stats.completedGoals} tone="emerald" />
            <StatCard label="Streak actuel" type="currentStreak" value={stats.currentStreak} tone="amber" />
            <StatCard label="Interactions globales" type="interactions" value={stats.interactions} />
          </div>

          <AdminPanel className="p-5">
            <div className="flex items-center gap-3">
              <Layers3 className="h-5 w-5 text-amber-300" aria-hidden="true" />
              <h2 className="text-lg font-extrabold text-white">Thèmes les plus vus</h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {detail.topThemes.length > 0 ? (
                detail.topThemes.map((theme) => (
                  <Link
                    key={theme.slug}
                    href={`/discover/theme/${theme.slug}`}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition hover:-translate-y-0.5 hover:border-slate-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 font-bold text-white">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: theme.accent }} />
                        <span className="truncate">{theme.name}</span>
                      </span>
                      <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-slate-300">
                        {theme.count}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-slate-800 p-5 text-sm text-slate-400">
                  Aucun thème dominant pour le moment.
                </p>
              )}
            </div>
          </AdminPanel>
        </div>

        <AdminPanel className="p-5">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-amber-300" aria-hidden="true" />
            <h2 className="text-lg font-extrabold text-white">Activité récente</h2>
          </div>
          <div className="mt-5 space-y-3">
            {detail.recentActivity.length > 0 ? (
              detail.recentActivity.map((item) => (
                <Link
                  key={`${item.type}-${item.factSlug}-${item.at}`}
                  href={`/fact/${item.factSlug}`}
                  className="block rounded-lg border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.accent }} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                        {item.label} · {formatDate(item.at)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-slate-100">
                        {item.factTitle}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-dashed border-slate-800 p-5 text-sm text-slate-400">
                Aucune activité récente.
              </p>
            )}
          </div>
        </AdminPanel>
      </section>
    </>
  );
}
