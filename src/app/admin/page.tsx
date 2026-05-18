"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAdminDashboardData } from "@/lib/admin";
import type { AdminDashboardData } from "@/lib/admin";
import {
  AdminLoadingRows,
  AdminMessage,
  AdminPageHeader,
  AdminPanel,
} from "./components";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const nextData = await getAdminDashboardData();

        if (isMounted) {
          setData(nextData);
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

  return (
    <>
      <AdminPageHeader
        eyebrow="Vue d'ensemble"
        title="Dashboard"
        description="Pilotage rapide des contenus, utilisateurs et signaux de progression."
        action={
          <Link
            href="/admin/facts"
            className="rounded-md bg-amber-300 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amber-200"
          >
            Nouveau fait
          </Link>
        }
      />

      <AdminMessage message={error} tone="error" />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-900" />
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {data.stats.map((stat) => (
              <AdminPanel key={stat.label} className="p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-3 text-3xl font-extrabold text-white">
                  {stat.value}
                </p>
              </AdminPanel>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
            <AdminPanel>
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <h2 className="text-lg font-extrabold">Derniers faits</h2>
                <Link href="/admin/facts" className="text-sm font-bold text-amber-300">
                  Tout voir
                </Link>
              </div>
              <div className="divide-y divide-slate-800">
                {data.recentFacts.length > 0 ? (
                  data.recentFacts.map((fact) => (
                    <div key={fact.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-slate-300">
                          {fact.categories?.name ?? "Sans theme"}
                        </span>
                        <span className="rounded bg-slate-900 px-2 py-1 text-xs font-bold text-slate-400">
                          {fact.status}
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
                <h2 className="text-lg font-extrabold">Acces rapides</h2>
              </div>
              <div className="grid gap-3 p-5">
                {[
                  ["Gerer les faits", "/admin/facts"],
                  ["Gerer les themes", "/admin/themes"],
                  ["Gerer les utilisateurs", "/admin/users"],
                  ["Roles et permissions", "/admin/roles"],
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
                <Link href="/admin/users" className="text-sm font-bold text-amber-300">
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
