"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  deleteAdminGrade,
  getAdminGrade,
  type AdminGrade,
} from "@/lib/admin";
import { AdminBackLink } from "../../forms";
import {
  AdminAttributeList,
  AdminAttributeRow,
  AdminCard,
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

export default function AdminGradeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [grade, setGrade] = useState<AdminGrade | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadGrade = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setGrade(await getAdminGrade(params.id));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Ce grade ne peut pas être chargé.",
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadGrade();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadGrade]);

  async function removeGrade() {
    if (!grade || !window.confirm(`Supprimer le grade "${grade.name}" ?`)) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteAdminGrade(grade.id);

    setDeleting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push("/admin/grades?deleted=1");
    router.refresh();
  }

  return (
    <>
      <AdminPageHeading
        current="Grade"
        title={grade?.name ? "D?tail du grade" : "Grade"}
        description="Consultation du palier de progression."
        action={
          <div className="flex flex-wrap gap-3">
            <AdminBackLink href="/admin/grades">Retour aux grades</AdminBackLink>
            {grade ? (
              <Link
                href={`/admin/grades/${grade.id}/edit`}
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
      ) : !grade ? (
        <AdminCard className="p-6 text-sm text-gray-500">
          Aucun grade ne correspond à cette fiche.
        </AdminCard>
      ) : (
        <AdminCard className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-3xl text-sm text-gray-500">
                  {grade.description ?? "Aucune description renseign?e."}
            </p>
            <button
              type="button"
              onClick={removeGrade}
              disabled={deleting}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Supprimer
            </button>
          </div>
          <AdminAttributeList className="mt-6">
            <AdminAttributeRow label="ID" value={grade.id} />
            <AdminAttributeRow label="Slug" value={grade.slug} />
            <AdminAttributeRow
              label="Nom"
              technicalName="name"
              value={grade.name}
            />
            <AdminAttributeRow
              label="Description"
              value={grade.description ?? "-"}
            />
            <AdminAttributeRow label="Badge" value={grade.badge ?? "-"} />
            <AdminAttributeRow
              label="Objectifs requis"
              technicalName="required_goals"
              value={grade.required_goals}
            />
            <AdminAttributeRow
              label="Ordre d'affichage"
              technicalName="display_order"
              value={grade.display_order}
            />
            <AdminAttributeRow
              label="Système"
              technicalName="is_system"
              value={grade.is_system ? "Oui" : "Non"}
            />
            <AdminAttributeRow
              label="Créé le"
              technicalName="created_at"
              value={formatDate(grade.created_at)}
            />
            <AdminAttributeRow
              label="Édité le"
              technicalName="updated_at"
              value={formatDate(grade.updated_at)}
            />
          </AdminAttributeList>
        </AdminCard>
      )}
    </>
  );
}
