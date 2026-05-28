"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  deleteAdminFact,
  FACT_STATUS_LABELS,
  getAdminFact,
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

    router.push("/admin/facts");
    router.refresh();
  }

  return (
    <>
      <AdminPageHeading
        current="Fait"
        title={fact?.title ?? "Détail du fait"}
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
                value={`${fact.categories?.name ?? "Sans thème"} (${fact.category_id})`}
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

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <AdminCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-800">Contenu</h2>
              <AdminAttributeList className="mt-5">
                <DetailItem
                  label="Contenu"
                  value={
                    <span className="block whitespace-pre-wrap font-normal leading-7 text-gray-700">
                      {fact.content}
                    </span>
                  }
                />
                <DetailItem
                  label="Contenu long"
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
                  value={fact.authorProfile?.username ?? "-"}
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
          </div>
        </>
      )}
    </>
  );
}
