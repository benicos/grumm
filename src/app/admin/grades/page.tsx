"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import GradeIcon, { getGradeIconLabel } from "@/app/components/GradeIcon";
import { deleteAdminGrade, getAdminGrades } from "@/lib/admin";
import type { AdminGrade } from "@/lib/admin";
import { hasPermission } from "@/lib/roles";
import { useAuth } from "../../auth/AuthProvider";
import {
  AdminButton,
  AdminLoadingRows,
  AdminMessage,
  AdminPageHeader,
  AdminPager,
  AdminPanel,
  AdminSearch,
  AdminTableEmpty,
} from "../components";

export default function AdminGradesPage() {
  const { profile } = useAuth();
  const [grades, setGrades] = useState<AdminGrade[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManageGrades = hasPermission(profile, "grades.manage");

  async function loadGrades(nextPage = page) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAdminGrades({ page: nextPage, pageSize, query });
      setGrades(result.items);
      setTotal(result.total);
      setPage(result.page);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les grades.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!canManageGrades) {
      return;
    }

    let isMounted = true;

    async function loadInitialGrades() {
      try {
        const result = await getAdminGrades({ page, pageSize, query });

        if (!isMounted) {
          return;
        }

        setGrades(result.items);
        setTotal(result.total);
        setPage(result.page);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les grades.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialGrades();

    return () => {
      isMounted = false;
    };
  }, [canManageGrades, page, pageSize, query]);

  async function removeGrade(grade: AdminGrade) {
    if (!window.confirm(`Supprimer le grade "${grade.name}" ?`)) {
      return;
    }

    setIsBusy(true);
    const result = await deleteAdminGrade(grade.id);
    setIsBusy(false);
    setMessage(result.ok ? result.message : null);
    setError(result.ok ? null : result.message);
    await loadGrades();
  }

  if (!canManageGrades) {
    return (
      <AdminPageHeader
        eyebrow="Grades"
        title="Accès réservé"
        description="La gestion des grades est réservée aux administrateurs."
      />
    );
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Progression"
        title="Grades"
        description="Paliers de progression utilisés automatiquement sur le profil."
        action={
          <Link
            href="/admin/grades/create"
            className="rounded-md bg-amber-300 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amber-200"
          >
            Créer un grade
          </Link>
        }
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <AdminPanel>
        <div className="grid gap-3 border-b border-slate-800 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <AdminSearch
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
              setIsLoading(true);
            }}
            placeholder="Rechercher un grade..."
          />
          <span className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-slate-300">
            {total} grades
          </span>
        </div>

        {isLoading ? (
          <AdminLoadingRows />
        ) : grades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-900/70 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Objectifs requis</th>
                  <th className="px-4 py-3">Ordre</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {grades.map((grade) => (
                  <tr key={grade.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-800 bg-slate-900 text-amber-300">
                          <GradeIcon badge={grade.badge} className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-white">{grade.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {grade.slug} · {getGradeIconLabel(grade.badge)}
                          </p>
                        </div>
                      </div>
                      {grade.description && (
                        <p className="mt-2 text-sm text-slate-400">
                          {grade.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {grade.required_goals}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {grade.display_order}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/grades/${grade.id}`}
                          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
                        >
                          Modifier
                        </Link>
                        <AdminButton
                          tone="danger"
                          disabled={isBusy}
                          onClick={() => removeGrade(grade)}
                        >
                          Supprimer
                        </AdminButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <AdminTableEmpty label="Aucun grade trouvé." />
          </div>
        )}

        <AdminPager
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            setIsLoading(true);
          }}
        />
      </AdminPanel>
    </>
  );
}
