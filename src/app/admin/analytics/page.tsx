"use client";

import Link from "next/link";
import {
  BarChart3,
  Bookmark,
  Clock,
  Eye,
  Heart,
  MousePointerClick,
  Share2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAdminAnalyticsData, type AdminAnalyticsData } from "@/lib/admin";
import {
  AdminLoadingRows,
  AdminMessage,
  AdminPageHeader,
  AdminPanel,
} from "../components";

function formatSeconds(seconds: number) {
  if (seconds <= 0) {
    return "0 s";
  }

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return minutes > 0 ? `${minutes} min ${rest}s` : `${rest} s`;
}

function StatCard({
  Icon = BarChart3,
  label,
  value,
}: {
  Icon?: typeof BarChart3;
  label: string;
  value: number | string;
}) {
  return (
    <AdminPanel className="p-5">
      <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg border border-[#465fff]/20 bg-[#465fff]/10 text-[#93c5fd]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-extrabold text-white">{value}</p>
    </AdminPanel>
  );
}

function InlineStat({
  Icon = BarChart3,
  label,
  value,
}: {
  Icon?: typeof BarChart3;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-[#1d2939] bg-[#1d2939]/55 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <p className="text-xs font-bold uppercase tracking-[0.14em]">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-extrabold text-white">{value}</p>
    </div>
  );
}

function ProgressRow({
  label,
  percent,
  value,
}: {
  label: string;
  percent: number;
  value: string;
}) {
  return (
    <div className="grid gap-2 rounded-lg border border-[#1d2939] bg-[#1d2939]/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-white">{label}</span>
        <span className="text-sm font-bold text-slate-400">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#344054]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#465fff] to-[#36c2ff]"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function FactList({
  empty,
  facts,
  title,
}: {
  empty: string;
  facts: AdminAnalyticsData["reading"]["topReadFacts"];
  title: string;
}) {
  const max = Math.max(...facts.map((fact) => fact.value), 1);

  return (
    <AdminPanel>
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-extrabold">{title}</h2>
      </div>
      <div className="grid gap-2 p-5">
        {facts.length > 0 ? (
          facts.map((fact) => (
            <Link
              href={`/fact/${fact.slug}`}
              key={fact.id}
              className="grid gap-3 rounded-md border border-slate-800 bg-slate-900/55 p-3 transition hover:border-slate-700"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="line-clamp-2 text-sm font-bold text-white">
                  {fact.title}
                </span>
                <span className="shrink-0 rounded-full bg-slate-800 px-3 py-1 text-xs font-extrabold text-[#93c5fd]">
                  {fact.value}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#465fff] to-[#36c2ff]"
                  style={{ width: `${Math.max(8, (fact.value / max) * 100)}%` }}
                />
              </div>
            </Link>
          ))
        ) : (
          <p className="rounded-md border border-dashed border-slate-800 p-5 text-sm text-slate-400">
            {empty}
          </p>
        )}
      </div>
    </AdminPanel>
  );
}

function ThemeList({
  empty,
  themes,
  title,
}: {
  empty: string;
  themes: AdminAnalyticsData["categories"]["topOpenedThemes"];
  title: string;
}) {
  const max = Math.max(...themes.map((theme) => theme.value), 1);

  return (
    <AdminPanel>
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="text-lg font-extrabold">{title}</h2>
      </div>
      <div className="grid gap-3 p-5">
        {themes.length > 0 ? (
          themes.map((theme) => (
            <ProgressRow
              key={theme.slug}
              label={theme.name}
              percent={(theme.value / max) * 100}
              value={`${theme.value}`}
            />
          ))
        ) : (
          <p className="rounded-md border border-dashed border-slate-800 p-5 text-sm text-slate-400">
            {empty}
          </p>
        )}
      </div>
    </AdminPanel>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      try {
        const nextData = await getAdminAnalyticsData();

        if (isMounted) {
          setData(nextData);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les analytics.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <AdminPageHeader
        eyebrow="Analytics interne"
        title="Usage Grumm."
        description="Statistiques first-party des 30 derniers jours, hors /admin et hors compte administrateur."
      />

      <AdminMessage message={error} tone="error" />

      {isLoading ? (
        <AdminLoadingRows rows={8} />
      ) : data ? (
        <div className="grid gap-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard Icon={Users} label="Visiteurs uniques" value={data.overview.uniqueVisitors} />
            <StatCard Icon={Users} label="Utilisateurs connectés" value={data.overview.signedInUsers} />
            <StatCard Icon={Users} label="Visiteurs anonymes" value={data.overview.anonymousVisitors} />
            <StatCard Icon={BarChart3} label="Sessions totales" value={data.overview.totalSessions} />
            <StatCard
              Icon={Clock}
              label="Temps moyen / session"
              value={formatSeconds(data.overview.averageSessionSeconds)}
            />
            <StatCard Icon={Eye} label="Faits lus" value={data.overview.factsRead} />
            <StatCard Icon={BarChart3} label="Faits lus / session" value={data.overview.factsPerSession} />
            <StatCard
              Icon={Eye}
              label="Lecture complète"
              value={`${data.reading.completionRate}%`}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <AdminPanel>
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="text-lg font-extrabold">Plateformes</h2>
              </div>
              <div className="grid gap-3 p-5">
                {data.platforms.length > 0 ? (
                  data.platforms.map((platform, index) => (
                    <ProgressRow
                      key={`${platform.label}:${index}`}
                      label={platform.label}
                      percent={platform.percent}
                      value={`${platform.count} (${platform.percent}%)`}
                    />
                  ))
                ) : (
                  <p className="text-sm text-slate-400">Aucune session suivie.</p>
                )}
              </div>
            </AdminPanel>

            <AdminPanel>
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="text-lg font-extrabold">Engagement</h2>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <InlineStat Icon={Heart} label="Likes" value={data.engagement.likes} />
                <InlineStat Icon={Bookmark} label="Saves" value={data.engagement.saves} />
                <InlineStat Icon={Share2} label="Shares" value={data.engagement.shares} />
                <InlineStat Icon={MousePointerClick} label="Clics source" value={data.engagement.sourceClicks} />
                <InlineStat
                  Icon={BarChart3}
                  label="Taux interaction"
                  value={`${data.engagement.interactionRate}%`}
                />
                <InlineStat
                  Icon={Clock}
                  label="Temps moyen lecture"
                  value={formatSeconds(data.reading.averageReadSeconds)}
                />
              </div>
            </AdminPanel>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <FactList
              empty="Aucune lecture enregistrée."
              facts={data.reading.topReadFacts}
              title="Faits les plus lus"
            />
            <FactList
              empty="Aucun like enregistré."
              facts={data.reading.topLikedFacts}
              title="Faits les plus likés"
            />
            <FactList
              empty="Aucune sauvegarde enregistrée."
              facts={data.reading.topSavedFacts}
              title="Faits les plus sauvegardés"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <AdminPanel className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Rétention
              </p>
              <div className="mt-5 grid gap-4">
                <InlineStat
                  Icon={Users}
                  label="Revenus au moins 2 fois"
                  value={data.retention.returnedAtLeast2Times}
                />
                <InlineStat
                  Icon={Users}
                  label="Revenus après 7 jours"
                  value={data.retention.returnedAfter7Days}
                />
                <InlineStat
                  Icon={BarChart3}
                  label="Fréquence moyenne"
                  value={data.retention.averageReturnFrequency}
                />
              </div>
            </AdminPanel>
            <ThemeList
              empty="Aucun thème consulté."
              themes={data.categories.topOpenedThemes}
              title="Thèmes les plus consultés"
            />
            <ThemeList
              empty="Aucun engagement par thème."
              themes={data.categories.bestEngagementThemes}
              title="Meilleur engagement"
            />
          </section>
        </div>
      ) : null}
    </>
  );
}
