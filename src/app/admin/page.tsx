"use client";

import Link from "next/link";
import { BarChart3, BookOpen, Clock3, Tags, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  FACT_STATUS_LABELS,
  getAdminAnalyticsData,
  getAdminDashboardData,
  type AdminAnalyticsData,
  type AdminDashboardData,
} from "@/lib/admin";
import {
  AdminCard,
  AdminLineChart,
  AdminMetricCard,
  AdminNotice,
  AdminPageHeading,
  AdminTable,
  AdminTableSkeleton,
  AdminWarningAlert,
} from "./ui";

type RankedRow = {
  href?: string;
  id: string;
  label: string;
  meta?: string;
  value: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function getStatValue(data: AdminDashboardData | null, label: string) {
  return data?.stats.find((stat) => stat.label === label)?.value ?? 0;
}

function AdminTopTable({
  description,
  empty,
  rows,
  title,
  valueLabel,
}: {
  description: string;
  empty: string;
  rows: RankedRow[];
  title: string;
  valueLabel: string;
}) {
  return (
    <AdminCard className="p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500">Nom</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">
                {valueLabel}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    {row.href ? (
                      <Link
                        href={row.href}
                        className="font-medium text-gray-800 transition hover:text-[#465fff]"
                      >
                        {row.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-gray-800">
                        {row.label}
                      </span>
                    )}
                    {row.meta ? (
                      <span className="mt-1 block text-xs text-gray-500">
                        {row.meta}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {row.value}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-10 text-center text-sm text-gray-500"
                >
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminCard>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);

      try {
        const dashboard = await getAdminDashboardData();

        if (!mounted) {
          return;
        }

        setData(dashboard);

        if (dashboard.role === "administrateur") {
          try {
            setAnalytics(await getAdminAnalyticsData());
          } catch {
            if (mounted) {
              setAnalyticsError(
                "Les analytics ne sont pas disponibles pour le moment.",
              );
            }
          }
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Le tableau de bord ne peut pas être chargé.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const topReadFacts =
    analytics?.reading.topReadFacts.slice(0, 5).map((fact) => ({
      href: `/fact/${fact.slug}`,
      id: fact.id,
      label: fact.title,
      value: fact.value,
    })) ?? [];
  const topReadThemes =
    analytics?.categories.topOpenedThemes.slice(0, 5).map((theme) => ({
      href: `/discover/theme/${theme.slug}`,
      id: theme.slug,
      label: theme.name,
      value: theme.value,
    })) ?? [];
  const topInteractedFacts =
    analytics?.topInteractions.facts.map((fact) => ({
      href: `/fact/${fact.slug}`,
      id: fact.id,
      label: fact.title,
      value: fact.value,
    })) ?? [];
  const topInteractedThemes =
    analytics?.topInteractions.themes.map((theme) => ({
      href: `/discover/theme/${theme.slug}`,
      id: theme.slug,
      label: theme.name,
      value: theme.value,
    })) ?? [];

  return (
    <>
      <AdminPageHeading
        current="Tableau de bord"
        title="Tableau de bord"
        description="Synthèse des contenus, de la modération et de l’usage."
      />
      <AdminNotice message={error} tone="error" />
      <AdminNotice message={analyticsError} tone="error" />

      {(data?.pendingFactsCount ?? 0) > 0 ? (
        <AdminWarningAlert
          title="Validation requise"
          message={`${data?.pendingFactsCount ?? 0} fait${
            (data?.pendingFactsCount ?? 0) > 1 ? "s sont" : " est"
          } en attente de validation.`}
          action={
            <Link
              href="/admin/facts?status=pending_review"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white px-4 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
            >
              Ouvrir la file
            </Link>
          }
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          icon={BookOpen}
          label="Faits"
          value={getStatValue(data, "Faits")}
          meta="Contenu"
        />
        <AdminMetricCard
          icon={Tags}
          label="Thèmes"
          value={getStatValue(data, "Thèmes")}
          meta="Taxonomie"
        />
        <AdminMetricCard
          icon={BarChart3}
          label="Vues uniques"
          value={getStatValue(data, "Vues uniques")}
          meta="Lecture"
        />
        <AdminMetricCard
          icon={Users}
          label="Utilisateurs"
          value={getStatValue(data, "Utilisateurs")}
          meta="Profils"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminLineChart
          title="Inscriptions par jour"
          description="Profils créés sur 14 jours, comparés aux 14 jours précédents."
          points={analytics?.series.registrations ?? []}
        />
        <AdminLineChart
          title="Visiteurs par jour"
          description="Visiteurs distincts par session, hors espace admin."
          points={analytics?.series.visitors ?? []}
        />
      </div>

      <div className="mt-6">
        <AdminLineChart
          title="Faits lus par jour"
          description="Lectures enregistrées chaque jour, hors comptes administrateurs."
          points={analytics?.series.factReads ?? []}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminTopTable
          title="Top 5 des faits les plus lus"
          description="Lectures issues des événements de lecture."
          valueLabel="Lectures"
          empty="Aucune lecture enregistrée."
          rows={topReadFacts}
        />
        <AdminTopTable
          title="Top 5 des thèmes les plus lus"
          description="Thèmes associés aux faits ouverts."
          valueLabel="Lectures"
          empty="Aucun thème lu pour le moment."
          rows={topReadThemes}
        />
        <AdminTopTable
          title="Top 5 des faits les plus interagis"
          description="Likes, sauvegardes, partages et clics suivis."
          valueLabel="Interactions"
          empty="Aucune interaction enregistrée."
          rows={topInteractedFacts}
        />
        <AdminTopTable
          title="Top 5 des thèmes les plus interagis"
          description="Interactions agrégées par thème."
          valueLabel="Interactions"
          empty="Aucune interaction par thème enregistrée."
          rows={topInteractedThemes}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <AdminCard className="p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-800">
              Faits récents
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Derniers contenus enregistrés dans la base.
            </p>
          </div>
          {loading ? (
            <AdminTableSkeleton />
          ) : (
            <AdminTable
              rows={data?.recentFacts ?? []}
              empty="Aucun fait disponible."
              rowKey={(fact) => fact.id}
              columns={[
                {
                  key: "title",
                  label: "Fait",
                  render: (fact) => (
                    <div>
                      <p className="font-medium text-gray-800">{fact.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{fact.slug}</p>
                    </div>
                  ),
                },
                {
                  key: "theme",
                  label: "Thème",
                  render: (fact) => fact.categories?.name ?? "-",
                },
                {
                  key: "status",
                  label: "Statut",
                  render: (fact) => (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      {FACT_STATUS_LABELS[fact.status]}
                    </span>
                  ),
                },
                {
                  key: "created",
                  label: "Création",
                  render: (fact) => formatDate(fact.created_at),
                },
              ]}
            />
          )}
        </AdminCard>

        <AdminCard className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Clock3 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                File de validation
              </h2>
              <p className="text-sm text-gray-500">
                Faits en attente d’une décision.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {(data?.pendingFacts ?? []).slice(0, 5).map((fact) => (
              <div
                key={fact.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <p className="line-clamp-2 text-sm font-medium text-gray-800">
                  {fact.title}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  {fact.categories?.name ?? "Sans thème"} -{" "}
                  {formatDate(fact.created_at)}
                </p>
              </div>
            ))}
            {!loading && (data?.pendingFacts.length ?? 0) === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                Aucun fait n’attend de validation.
              </p>
            ) : null}
          </div>
        </AdminCard>
      </div>
    </>
  );
}
