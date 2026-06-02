"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  addAdminFactRelation,
  deleteAdminFact,
  deleteAdminFactRelation,
  FACT_STATUS_LABELS,
  getAdminFact,
  searchAdminFactOptions,
  type AdminFact,
} from "@/lib/admin";
import { getDifficultyLevelLabel } from "@/lib/learning";
import { AdminBackLink } from "../../forms";
import {
  AdminAttributeList,
  AdminAttributeRow,
  AdminCard,
  AdminNotice,
  AdminPageHeading,
  AdminTableSkeleton,
} from "../../ui";

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DetailItem({
  label,
  technicalName,
  value,
}: {
  label: string;
  technicalName?: string;
  value: React.ReactNode;
}) {
  return <AdminAttributeRow label={label} technicalName={technicalName} value={value} />;
}

export default function AdminFactDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [fact, setFact] = useState<AdminFact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [relationQuery, setRelationQuery] = useState("");
  const [relationOptions, setRelationOptions] = useState<
    { categoryName: string | null; id: string; title: string }[]
  >([]);
  const [relationBusy, setRelationBusy] = useState(false);

  const loadFact = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAdminFact(params.id);
      setFact(result.fact);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Ce fait ne peut pas être chargé.",
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    let mounted = true;
    const timeout = window.setTimeout(() => {
      if (relationQuery.trim().length < 2) {
        setRelationOptions([]);
        return;
      }

      void searchAdminFactOptions(relationQuery).then((options) => {
        if (mounted) {
          const existingIds = new Set([
            params.id,
            ...(fact?.relatedFacts ?? []).map((related) => related.id),
          ]);
          setRelationOptions(options.filter((option) => !existingIds.has(option.id)));
        }
      });
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
    };
  }, [fact?.relatedFacts, params.id, relationQuery]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadFact();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadFact]);

  async function removeFact() {
    if (!fact || !window.confirm(`Supprimer le fait "${fact.title}" ?`)) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteAdminFact(fact.id);

    setDeleting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push("/admin/facts?deleted=1");
    router.refresh();
  }

  async function addRelation(relatedFactId: string) {
    setRelationBusy(true);
    setError(null);

    const result = await addAdminFactRelation({
      relatedFactId,
      sourceFactId: params.id,
    });

    setRelationBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setRelationQuery("");
    setRelationOptions([]);
    await loadFact();
  }

  async function removeRelation(relationId: string) {
    setRelationBusy(true);
    setError(null);

    const result = await deleteAdminFactRelation(relationId);

    setRelationBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    await loadFact();
  }

  return (
    <>
      <AdminPageHeading
        current="Fait"
        title={fact?.title ? "Détail du fait" : "Fait"}
        description="Consultation du contenu dans l'espace d'administration."
        action={
          <div className="flex flex-wrap gap-3">
            <AdminBackLink href="/admin/facts">Retour aux faits</AdminBackLink>
            {fact ? (
              <Link
                href={`/admin/facts/${fact.id}/edit`}
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
      ) : !fact ? (
        <AdminCard className="p-6 text-sm text-gray-500">
          Aucun fait ne correspond à cette fiche.
        </AdminCard>
      ) : (
        <>
          <AdminCard className="p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#ecf3ff] px-2.5 py-1 text-xs font-medium text-[#465fff]">
                    {FACT_STATUS_LABELS[fact.status]}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    {fact.categories?.name ?? "Sans thème"}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-gray-800">
                  {fact.title}
                </h2>
                {fact.hook ? (
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-600">
                    {fact.hook}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={removeFact}
                disabled={deleting}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Supprimer
              </button>
            </div>

            <AdminAttributeList className="mt-6">
              <DetailItem label="Titre" technicalName="title" value={fact.title} />
              <DetailItem label="Slug" value={fact.slug} />
              <DetailItem label="ID" value={fact.id} />
              <DetailItem
                label="Statut"
                technicalName="status"
                value={FACT_STATUS_LABELS[fact.status]}
              />
              <DetailItem
                label="Niveau"
                technicalName="difficulty_level"
                value={getDifficultyLevelLabel(fact.difficulty_level)}
              />
              <DetailItem
                label="Thème"
                technicalName="category_id"
                value={
                  fact.categories?.slug ? (
                    <Link
                      href={`/admin/themes/${fact.category_id}`}
                      className="text-[#465fff] hover:underline"
                    >
                      {fact.categories.name}
                    </Link>
                  ) : (
                    "Sans thème"
                  )
                }
              />
              <DetailItem
                label="Ordre d'affichage"
                technicalName="display_order"
                value={fact.display_order}
              />
              <DetailItem
                label="Accroche"
                technicalName="hook"
                value={fact.hook ?? "-"}
              />
              <DetailItem
                label="Date éditoriale"
                value={
                  fact.event_day && fact.event_month
                    ? `${String(fact.event_day).padStart(2, "0")}/${String(fact.event_month).padStart(2, "0")}${fact.event_year ? `/${fact.event_year}` : ""}`
                    : "-"
                }
              />
              <DetailItem
                label="Titre SEO"
                technicalName="seo_title"
                value={fact.seo_title ?? "-"}
              />
              <DetailItem
                label="Description SEO"
                technicalName="seo_description"
                value={fact.seo_description ?? "-"}
              />
              <DetailItem
                label="Créé le"
                technicalName="created_at"
                value={formatDate(fact.created_at)}
              />
              <DetailItem
                label="Édité le"
                technicalName="updated_at"
                value={formatDate(fact.updated_at)}
              />
            </AdminAttributeList>
          </AdminCard>

          <div className="mt-6 grid gap-6">
            <AdminCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-800">Contenu</h2>
              <AdminAttributeList className="mt-5">
                <DetailItem
                  label="Contexte"
                  technicalName="content"
                  value={
                    <span className="block whitespace-pre-wrap font-normal leading-7 text-gray-700">
                      {fact.content}
                    </span>
                  }
                />
                <DetailItem
                  label="En savoir plus"
                  technicalName="long_content"
                  value={
                    fact.long_content ? (
                      <span className="block whitespace-pre-wrap font-normal leading-7 text-gray-700">
                        {fact.long_content}
                      </span>
                    ) : (
                      "-"
                    )
                  }
                />
              </AdminAttributeList>
            </AdminCard>

            <AdminCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-800">
                Publication
              </h2>
              <AdminAttributeList className="mt-5">
                <DetailItem label="Source" value={fact.source?.trim() || "-"} />
                <DetailItem
                  label="URL source"
                  technicalName="source_url"
                  value={
                    fact.source_url ? (
                      <a
                        href={fact.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#465fff] hover:underline"
                      >
                        {fact.source_url}
                      </a>
                    ) : (
                      "-"
                    )
                  }
                />
                <DetailItem
                  label="Publié le"
                  technicalName="published_at"
                  value={formatDate(fact.published_at)}
                />
                <DetailItem
                  label="Auteur"
                  technicalName="author_id"
                  value={
                    fact.authorProfile ? (
                      <Link
                        href={`/admin/users/${fact.authorProfile.id}`}
                        className="text-[#465fff] hover:underline"
                      >
                        {fact.authorProfile.username ?? fact.authorProfile.id}
                      </Link>
                    ) : (
                      "-"
                    )
                  }
                />
                <DetailItem
                  label="Ton"
                  technicalName="tone"
                  value={fact.tone ?? "-"}
                />
                <DetailItem
                  label="Couleur d'accent"
                  technicalName="accent_color"
                  value={fact.accent_color ?? "-"}
                />
              </AdminAttributeList>
            </AdminCard>

            <AdminCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-800">Question</h2>
              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm">
                {fact.quizQuestion ? (
                  <Link
                    href={`/admin/quizzes/${fact.quizQuestion.id}`}
                    className="font-medium text-[#465fff] hover:underline"
                  >
                    Question associée : {fact.quizQuestion.question}
                  </Link>
                ) : (
                  <p className="text-gray-500">
                    Aucune question quiz n&apos;est encore associée à ce fait.
                  </p>
                )}
              </div>
            </AdminCard>

            <AdminCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-800">
                Faits associés
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Ces liens sont prioritaires sur les suggestions automatiques affichées sur la page publique.
              </p>
              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]">
                <div className="space-y-2">
                  {(fact.relatedFacts ?? []).length > 0 ? (
                    fact.relatedFacts?.map((related) => (
                      <div
                        key={related.relationId}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/admin/facts/${related.id}`}
                            className="block truncate font-medium text-[#465fff] hover:underline"
                          >
                            {related.title}
                          </Link>
                          <p className="mt-1 text-xs text-gray-500">
                            {related.categoryName ?? "Sans thème"}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={relationBusy}
                          onClick={() => void removeRelation(related.relationId)}
                          className="shrink-0 rounded-lg border border-red-100 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          Retirer
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                      Aucun fait associé manuellement.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rechercher un fait publié
                    <input
                      value={relationQuery}
                      onChange={(event) => setRelationQuery(event.target.value)}
                      placeholder="Titre ou slug..."
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#465fff]"
                    />
                  </label>
                  {relationOptions.length > 0 ? (
                    <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                      {relationOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          disabled={relationBusy}
                          onClick={() => void addRelation(option.id)}
                          className="flex w-full items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <span className="font-medium text-gray-800">
                            {option.title}
                          </span>
                          <span className="shrink-0 text-xs text-gray-500">
                            Ajouter
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </AdminCard>
          </div>
        </>
      )}
    </>
  );
}
