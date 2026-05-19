"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getAdminGrade, saveAdminGrade } from "@/lib/admin";
import {
  AdminButton,
  AdminMessage,
  AdminPageHeader,
  AdminPanel,
} from "../components";

type GradeFormState = {
  badge: string;
  description: string;
  display_order: number;
  id: string;
  name: string;
  required_goals: number;
  slug: string;
};

const emptyGrade: GradeFormState = {
  badge: "",
  description: "",
  display_order: 0,
  id: "",
  name: "",
  required_goals: 0,
  slug: "",
};

export default function GradeEditor({ gradeId }: { gradeId?: string }) {
  const [form, setForm] = useState<GradeFormState>(emptyGrade);
  const [isLoading, setIsLoading] = useState(Boolean(gradeId));
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(gradeId);

  useEffect(() => {
    if (!gradeId) {
      return;
    }

    const currentGradeId = gradeId;
    let isMounted = true;

    async function loadGrade() {
      try {
        const grade = await getAdminGrade(currentGradeId);

        if (isMounted && grade) {
          setForm({
            badge: grade.badge ?? "",
            description: grade.description ?? "",
            display_order: grade.display_order,
            id: grade.id,
            name: grade.name,
            required_goals: grade.required_goals,
            slug: grade.slug,
          });
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger le grade.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadGrade();

    return () => {
      isMounted = false;
    };
  }, [gradeId]);

  async function submitGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage(null);
    setError(null);

    const result = await saveAdminGrade({
      ...form,
      badge: form.badge || null,
      description: form.description || null,
      id: form.id || undefined,
      slug: form.slug || undefined,
    });

    setIsBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);

    if (!isEditing) {
      setForm(emptyGrade);
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Progression"
        title={isEditing ? "Modifier un grade" : "Creer un grade"}
        description="Les grades sont attribues selon le nombre d'objectifs quotidiens atteints."
        action={
          <Link
            href="/admin/grades"
            className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
          >
            Retour aux grades
          </Link>
        }
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <AdminPanel className="p-5">
        {isLoading ? (
          <div className="h-80 animate-pulse rounded-md bg-slate-900" />
        ) : (
          <form onSubmit={submitGrade} className="grid gap-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-300">Nom</span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-300">Slug</span>
                <input
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, slug: event.target.value }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
                />
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="block">
                <span className="text-sm font-bold text-slate-300">
                  Objectifs requis
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.required_goals}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      required_goals: Number(event.target.value),
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-300">Ordre</span>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      display_order: Number(event.target.value),
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-slate-300">
                  Icone / badge
                </span>
                <input
                  value={form.badge}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, badge: event.target.value }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-slate-300">Description</span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="mt-2 min-h-28 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <AdminButton type="submit" disabled={isBusy}>
                Enregistrer
              </AdminButton>
              <Link
                href="/admin/grades"
                className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
              >
                Annuler
              </Link>
            </div>
          </form>
        )}
      </AdminPanel>
    </>
  );
}
