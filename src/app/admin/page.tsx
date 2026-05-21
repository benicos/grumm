"use client";

import Link from "next/link";
import { BookOpen, Clock, Eye, Layers3, Target, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  FACT_STATUS_LABELS,
  getAdminAnalyticsData,
  getAdminDashboardData,
  updateAdminFactStatus,
} from "@/lib/admin";
import type { AdminAnalyticsData, AdminDashboardData } from "@/lib/admin";
import {
  AdminLoadingRows,
  AdminMessage,
  AdminPageHeader,
  AdminPanel,
} from "./components";

function getAuthorLabel(fact: AdminDashboardData["pendingFacts"][number]) {
  if (!fact.author_id) {
    return "Import SQL";
  }

  return fact.authorProfile?.username ?? "Auteur inconnu";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const dashboardStatIcons = {
  "En attente": Clock,
  Faits: BookOpen,
  "Objectifs aujourd'hui": Target,
  "Thèmes": Layers3,
  Utilisateurs: Users,
  "Vues uniques": Eye,
} as const;

function DashboardBarList({
  empty,
  items,
  title,
}: {
  empty: string;
  items: { label: string; value: number }[];
  title: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <AdminPanel className="p-5">
      <h2 className="text-lg font-extrabold text-white">{title}</h2>
      <div className="mt-5 grid gap-3">
        {items.length > 0 ? (
          items.slice(0, 10).map((item, index) => (
            <div key={`${item.label}:${index}`} className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="line-clamp-1 font-bold text-slate-200">{item.label}</span>
                <span className="font-extrabold text-[#93c5fd]">{item.value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#1d2939]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#465fff] to-[#36c2ff]"
                  style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-slate-800 p-4 text-sm text-slate-500">
            {empty}
          </p>
        )}
      </div>
    </AdminPanel>
  );
}

function PlatformDonut({ platforms }: { platforms: AdminAnalyticsData["platforms"] }) {
  const web = platforms.find((platform) => platform.label.toLowerCase() === "web")?.percent ?? 0;
  const ios = platforms.find((platform) => platform.label.toLowerCase() === "ios")?.percent ?? 0;

  return (
    <AdminPanel className="p-5">
      <h2 className="text-lg font-extrabold text-white">Plateformes</h2>
      <div className="mt-5 flex items-center gap-5">
        <div
          className="h-32 w-32 rounded-full"
          style={{
            background: `conic-gradient(#465fff 0 ${web}%, #36c2ff ${web}% ${web + ios}%, #344054 ${web + ios}% 100%)`,
          }}
        />
        <div className="grid gap-3 text-sm">
          {platforms.map((platform, index) => (
            <div key={`${platform.label}:${index}`} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#465fff]" />
              <span className="font-bold text-slate-300">{platform.label}</span>
              <span className="font-extrabold text-white">{platform.percent}%</span>
            </div>
          ))}
        </div>
      </div>
    </AdminPanel>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const [nextData, nextAnalytics] = await Promise.all([
          getAdminDashboardData(),
          getAdminAnalyticsData().catch(() => null),
        ]);

        if (isMounted) {
          setData(nextData);
          setAnalytics(nextAnalytics);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger le dashboard.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  async function publishFact(id: string) {
    setIsBusy(true);
    setMessage(null);
    setError(null);

    const result = await updateAdminFactStatus(id, "published");
    setIsBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);

    try {
      const [nextData, nextAnalytics] = await Promise.all([
        getAdminDashboardData(),
        getAdminAnalyticsData().catch(() => null),
      ]);
      setData(nextData);
      setAnalytics(nextAnalytics);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de recharger le dashboard.",
      );
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Vue d'ensemble"
        title="Dashboard"
        description="Pilotage rapide des contenus, utilisateurs et signaux de progression."
        action={
          <Link
            href="/admin/facts/create"
            className="rounded-lg bg-[#465fff] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#3641f5]"
          >
            Nouveau fait
          </Link>
        }
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-900" />
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {data.stats.map((stat, index) => (
              <AdminPanel key={`${stat.label}:${index}`} className="p-5">
                {(() => {
                  const Icon =
                    dashboardStatIcons[
                      stat.label as keyof typeof dashboardStatIcons
                    ] ?? BookOpen;

                  return (
                    <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-[#465fff]/20 bg-[#465fff]/10 text-[#93c5fd]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  );
                })()}
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-3 text-3xl font-extrabold text-white">
                  {stat.value}
                </p>
              </AdminPanel>
            ))}
          </section>

          {analytics ? (
            <section className="grid gap-6 xl:grid-cols-3">
              <DashboardBarList
                title="Top faits vus"
                empty="Aucune lecture sur la période."
                items={analytics.reading.topReadFacts.map((fact) => ({
                  label: fact.title,
                  value: fact.value,
                }))}
              />
              <DashboardBarList
                title="Top thèmes vus"
                empty="Aucun thème ouvert sur la période."
                items={analytics.categories.topOpenedThemes.map((theme) => ({
                  label: theme.name,
                  value: theme.value,
                }))}
              />
              <PlatformDonut platforms={analytics.platforms} />
            </section>
          ) : null}

          {data.role === "administrateur" && (
            <AdminPanel>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
                <div>
                  <h2 className="text-lg font-extrabold">
                    Faits en attente
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {data.pendingFactsCount} a valider
                  </p>
                </div>
                <Link
                  href="/admin/facts/pending"
                  className="text-sm font-bold text-[#93c5fd]"
                >
                  Tout voir
                </Link>
              </div>
              {data.pendingFacts.length > 0 ? (
                <div className="divide-y divide-slate-800">
                  {data.pendingFacts.map((fact) => (
                    <div
                      key={fact.id}
                      className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-slate-300">
                            {fact.categories?.name ?? "Sans thème"}
                          </span>
                          <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-slate-400">
                            {getAuthorLabel(fact)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(fact.created_at)}
                          </span>
                        </div>
                        <p className="mt-2 font-bold text-white">{fact.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                          {fact.hook ?? "Sans phrase à retenir"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <Link
                          href={`/admin/facts/${fact.id}`}
                          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
                        >
                          Consulter
                        </Link>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => publishFact(fact.id)}
                          className="rounded-md bg-[#465fff] px-3 py-2 text-sm font-extrabold text-white transition hover:bg-[#3641f5] disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Valider
                        </button>
                        <Link
                          href={`/admin/facts/${fact.id}`}
                          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
                        >
                          Modifier
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-sm font-semibold text-slate-400">
                  Aucun fait en attente.
                </div>
              )}
            </AdminPanel>
          )}

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <AdminPanel>
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <h2 className="text-lg font-extrabold">Derniers faits</h2>
                <Link href="/admin/facts" className="text-sm font-bold text-[#93c5fd]">
                  Tout voir
                </Link>
              </div>
              <div className="divide-y divide-slate-800">
                {data.recentFacts.length > 0 ? (
                  data.recentFacts.map((fact) => (
                    <div key={fact.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-slate-300">
                          {fact.categories?.name ?? "Sans thème"}
                        </span>
                        <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-slate-400">
                          {FACT_STATUS_LABELS[fact.status]}
                        </span>
                      </div>
                      <p className="mt-2 font-bold text-white">{fact.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{fact.source}</p>
                    </div>
                  ))
                ) : (
                  <AdminLoadingRows rows={3} />
                )}
              </div>
            </AdminPanel>

            <AdminPanel>
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <h2 className="text-lg font-extrabold">Accès rapides</h2>
              </div>
              <div className="grid gap-3 p-5">
                {[
                  ["Gérer les faits", "/admin/facts"],
                  ["Valider les faits", "/admin/facts/pending"],
                  ["Gérer les thèmes", "/admin/themes"],
                  ["Gérer les utilisateurs", "/admin/users"],
                  ["Analytics interne", "/admin/analytics"],
                  ["Rôles et permissions", "/admin/roles"],
                  ["Grades", "/admin/grades"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-md border border-slate-800 bg-slate-900 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </AdminPanel>
          </section>

          {data.recentProfiles.length > 0 && (
            <AdminPanel>
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <h2 className="text-lg font-extrabold">Derniers utilisateurs</h2>
                <Link href="/admin/users" className="text-sm font-bold text-[#93c5fd]">
                  Tout voir
                </Link>
              </div>
              <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                {data.recentProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="rounded-md border border-slate-800 bg-slate-900 p-4"
                  >
                    <p className="font-bold text-white">{profile.username}</p>
                    <p className="mt-1 text-xs text-slate-500">{profile.role}</p>
                  </div>
                ))}
              </div>
            </AdminPanel>
          )}
        </div>
      ) : null}
    </>
  );
}
