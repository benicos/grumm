"use client";

import Link from "next/link";
import { BookOpen, Clock3, Target, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAdminAnalyticsData,
  getAdminDashboardData,
  getAdminFeedDebugRows,
  type AdminAnalyticsData,
  type AdminAnalyticsFunnel,
  type AdminAnalyticsMetric,
  type AdminDashboardData,
  type AdminFeedDebugRow,
} from "@/lib/admin";
import {
  AdminCard,
  AdminLineChart,
  AdminNotice,
  AdminPageHeading,
  AdminWarningAlert,
} from "./ui";

type RankedRow = {
  href?: string;
  id: string;
  label: string;
  meta?: string;
  value: number;
};

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
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
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

function formatSeconds(value: number) {
  if (value < 60) {
    return `${value}s`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function getTrend(metric: AdminAnalyticsMetric) {
  if (metric.previous === 0) {
    return metric.current > 0 ? "Nouveau vs hier" : "Stable vs hier";
  }

  const delta = Math.round(
    ((metric.current - metric.previous) / metric.previous) * 100,
  );

  return `${delta > 0 ? "+" : ""}${delta}% vs hier`;
}

function OverviewCard({
  icon: Icon,
  label,
  metric,
  value,
}: {
  icon: typeof Users;
  label: string;
  metric: AdminAnalyticsMetric;
  value: string;
}) {
  const positive = metric.current >= metric.previous;

  return (
    <AdminCard className="p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-gray-100 text-gray-800">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            positive
              ? "bg-green-50 text-green-600"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {getTrend(metric)}
        </span>
      </div>
      <p className="mt-5 text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-800">{value}</p>
    </AdminCard>
  );
}

function HealthMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-2 text-2xl font-semibold text-gray-800">{value}</dd>
    </div>
  );
}

function SectionHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}

function formatPercent(value: number) {
  return `${value}%`;
}

function FunnelCard({
  description,
  funnel,
  title,
}: {
  description: string;
  funnel: AdminAnalyticsFunnel;
  title: string;
}) {
  const maxValue = Math.max(1, ...funnel.steps.map((step) => step.value));

  return (
    <AdminCard className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right text-xs">
          <div className="rounded-xl bg-green-50 px-3 py-2 text-green-700">
            <span className="block font-semibold">
              {formatPercent(funnel.completionRate)}
            </span>
            <span>conversion</span>
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">
            <span className="block font-semibold">
              {formatPercent(funnel.abandonmentRate)}
            </span>
            <span>abandon</span>
          </div>
        </div>
      </div>
      <ol className="mt-5 space-y-3">
        {funnel.steps.map((step, index) => {
          const width = Math.max(4, (step.value / maxValue) * 100);

          return (
            <li key={step.id} className="rounded-2xl border border-gray-100 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {index + 1}. {step.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {index === 0
                      ? "Point d'entrée"
                      : `${formatPercent(step.conversionRate)} depuis l'étape précédente · ${formatPercent(step.dropoffRate)} abandon`}
                  </p>
                </div>
                <span className="text-lg font-bold text-gray-800">
                  {step.value.toLocaleString("fr-FR")}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#465fff]"
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </AdminCard>
  );
}

function formatHealthPercent(value: number | null) {
  return value === null ? "-" : `${value}%`;
}

function formatHealthAverage(value: number | null) {
  return value === null ? "-" : value.toLocaleString("fr-FR");
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedDebugRows, setFeedDebugRows] = useState<AdminFeedDebugRow[]>([]);
  const [feedDebugError, setFeedDebugError] = useState<string | null>(null);
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

          try {
            setFeedDebugRows(await getAdminFeedDebugRows());
          } catch {
            if (mounted) {
              setFeedDebugError(
                "Le debug du score feed n'est pas disponible pour le moment.",
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

  const readFactRows =
    analytics?.topContent.readFacts.map((fact) => ({
      href: `/admin/facts/${fact.id}`,
      id: fact.id,
      label: fact.title,
      value: fact.value,
    })) ?? [];
  const savedFactRows =
    analytics?.topContent.savedFacts.map((fact) => ({
      href: `/admin/facts/${fact.id}`,
      id: fact.id,
      label: fact.title,
      value: fact.value,
    })) ?? [];
  const readThemeRows =
    analytics?.topContent.readThemes.map((theme) => ({
      id: theme.slug,
      label: theme.name,
      value: theme.value,
    })) ?? [];
  const searchRows =
    analytics?.topContent.explorerSearches.map((search) => ({
      id: search.id,
      label: search.term,
      meta:
        search.noResultCount > 0
          ? `${search.noResultCount} sans résultat`
          : undefined,
      value: search.value,
    })) ?? [];

  return (
    <>
      <AdminPageHeading
        current="Tableau de bord"
        title="Tableau de bord"
        description="Croissance, engagement contenu et signaux éditoriaux utiles."
      />
      <AdminNotice message={error} tone="error" />
      <AdminNotice message={analyticsError} tone="error" />
      <AdminNotice message={feedDebugError} tone="error" />

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

      {!analytics ? (
        <AdminCard className="p-6 text-sm text-gray-500">
          {loading
            ? "Chargement des analytics produit..."
            : "Les analytics produit sont réservées aux administrateurs."}
        </AdminCard>
      ) : (
        <>
          <section>
            <SectionHeading
              title="Vue d'ensemble"
              description="Activité et objectifs du jour, comparés à hier."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <OverviewCard
                icon={Users}
                label="Utilisateurs actifs aujourd'hui"
                metric={analytics.overview.activeUsersToday}
                value={analytics.overview.activeUsersToday.current.toLocaleString(
                  "fr-FR",
                )}
              />
              <OverviewCard
                icon={BookOpen}
                label="Faits lus aujourd'hui"
                metric={analytics.overview.factsReadToday}
                value={analytics.overview.factsReadToday.current.toLocaleString(
                  "fr-FR",
                )}
              />
              <OverviewCard
                icon={Clock3}
                label="Temps moyen de lecture"
                metric={analytics.overview.averageReadSecondsToday}
                value={formatSeconds(
                  analytics.overview.averageReadSecondsToday.current,
                )}
              />
              <OverviewCard
                icon={Target}
                label="Objectifs atteints aujourd'hui"
                metric={analytics.overview.goalsCompletedToday}
                value={analytics.overview.goalsCompletedToday.current.toLocaleString(
                  "fr-FR",
                )}
              />
            </div>
          </section>

          <section className="mt-7">
            <SectionHeading
              title="Funnels produit"
              description="Conversion et abandon sur les parcours prioritaires des 14 derniers jours."
            />
            <div className="grid gap-6 xl:grid-cols-2">
              <FunnelCard
                title="Funnel principal"
                description="De la home à l'inscription, avec les premières interactions."
                funnel={analytics.funnels.main}
              />
              <FunnelCard
                title="Funnel quiz"
                description="Ouverture, démarrage, réponse et complétion des quiz."
                funnel={analytics.funnels.quiz}
              />
              <FunnelCard
                title="Funnel rétention"
                description="Cohortes simples depuis l'inscription vers J1, J7 et J30."
                funnel={analytics.funnels.retention}
              />
              <FunnelCard
                title="Funnel gamification"
                description="Profil, avatar, objectif, grade et retour lendemain."
                funnel={analytics.funnels.gamification}
              />
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <AdminLineChart
                title="Évolution funnel principal"
                description="Conversion finale quotidienne inscription / homepage."
                points={analytics.funnels.main.series}
              />
              <AdminLineChart
                title="Évolution quiz"
                description="Conversion finale quotidienne quiz terminé / quiz ouvert."
                points={analytics.funnels.quiz.series}
              />
              <AdminLineChart
                title="Évolution rétention"
                description="Conversion finale quotidienne retour J30 / inscription."
                points={analytics.funnels.retention.series}
              />
              <AdminLineChart
                title="Évolution gamification"
                description="Conversion finale quotidienne retour lendemain / profil ouvert."
                points={analytics.funnels.gamification.series}
              />
            </div>
          </section>

          <section className="mt-7">
            <SectionHeading
              title="Croissance"
              description="Acquisition et utilisateurs qui reviennent sur 14 jours."
            />
            <div className="grid gap-6 xl:grid-cols-2">
              <AdminLineChart
                title="Inscriptions par jour"
                description="Profils créés, comparés à la période précédente."
                points={analytics.series.registrations}
              />
              <AdminLineChart
                title="Utilisateurs actifs par jour"
                description="Identités actives par session hors espace admin."
                points={analytics.series.activeUsers}
              />
            </div>
          </section>

          <section className="mt-7">
            <SectionHeading
              title="Engagement contenu"
              description="Volume de lecture et attention avant changement de fait."
            />
            <div className="grid gap-6 xl:grid-cols-2">
              <AdminLineChart
                title="Faits lus par jour"
                description="Lectures éditoriales enregistrées chaque jour."
                points={analytics.series.factReads}
              />
              <AdminLineChart
                title="Temps moyen avant swipe"
                description="Durée moyenne mesurée à la sortie ou au changement de fait."
                points={analytics.series.averageSwipeSeconds}
              />
            </div>
          </section>

          <section className="mt-7">
            <SectionHeading
              title="Top contenu"
              description="Les signaux éditoriaux les plus actionnables."
            />
            <div className="grid gap-6 xl:grid-cols-2">
              <AdminTopTable
                title="Top faits lus"
                description="Faits éditoriaux les plus ouverts."
                valueLabel="Lectures"
                empty="Aucune lecture enregistrée."
                rows={readFactRows}
              />
              <AdminTopTable
                title="Top faits enregistrés"
                description="Faits que les membres gardent pour plus tard."
                valueLabel="Sauvegardes"
                empty="Aucune sauvegarde enregistrée."
                rows={savedFactRows}
              />
              <AdminTopTable
                title="Top thèmes lus"
                description="Thèmes des faits effectivement consultés."
                valueLabel="Lectures"
                empty="Aucun thème lu pour le moment."
                rows={readThemeRows}
              />
              <AdminTopTable
                title="Recherches Explorer populaires"
                description="Termes recherchés et besoins sans résultat."
                valueLabel="Recherches"
                empty="Aucune recherche Explorer disponible."
                rows={searchRows}
              />
            </div>
          </section>

          <section className="mt-7">
            <SectionHeading
              title="Santé produit"
              description="Rétention et intensité d'usage disponibles sans tracking intrusif."
            />
            <AdminCard className="p-5">
              <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <HealthMetric
                  label="Taux de retour D1"
                  value={formatHealthPercent(analytics.health.d1ReturnRate)}
                />
                <HealthMetric
                  label="Taux de retour D7"
                  value={formatHealthPercent(analytics.health.d7ReturnRate)}
                />
                <HealthMetric
                  label="Faits / jour / utilisateur"
                  value={formatHealthAverage(
                    analytics.health.averageFactsPerUserDay,
                  )}
                />
                <HealthMetric
                  label="Sessions moyennes / jour"
                  value={formatHealthAverage(
                    analytics.health.averageSessionsPerDay,
                  )}
                />
              </dl>
            </AdminCard>
          </section>

          <section className="mt-7">
            <SectionHeading
              title="Debug score"
              description="Lecture admin des principaux composants du score feed V2."
            />
            <AdminCard className="overflow-hidden">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 font-medium text-gray-500">
                        Fait
                      </th>
                      <th className="px-5 py-3 font-medium text-gray-500">
                        Thème
                      </th>
                      <th className="px-5 py-3 text-right font-medium text-gray-500">
                        Score
                      </th>
                      <th className="px-5 py-3 font-medium text-gray-500">
                        Détail
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {feedDebugRows.length > 0 ? (
                      feedDebugRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-5 py-4 font-medium text-gray-800">
                            {row.title}
                          </td>
                          <td className="px-5 py-4 text-gray-600">
                            {row.categoryName}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-gray-800">
                            {row.score}
                          </td>
                          <td className="px-5 py-4">
                            <code className="block max-w-[360px] truncate rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                              {JSON.stringify(row.scoreDebug)}
                            </code>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-5 py-10 text-center text-sm text-gray-500"
                        >
                          Aucun score disponible.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </AdminCard>
          </section>
        </>
      )}
    </>
  );
}
