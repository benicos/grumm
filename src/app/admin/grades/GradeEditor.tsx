"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { gradeIconOptions } from "@/config/app";
import { getAdminGrade, saveAdminGrade } from "@/lib/admin";
import { AdminBackLink, AdminField, adminFieldClassName } from "../forms";
import {
  AdminButton,
  AdminCard,
  AdminNotice,
  AdminPageHeading,
} from "../ui";

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
  badge: "sparkles",
  description: "",
  display_order: 0,
  id: "",
  name: "",
  required_goals: 0,
  slug: "",
};

export default function GradeEditor({ gradeId }: { gradeId?: string }) {
  const [form, setForm] = useState<GradeFormState>(emptyGrade);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(gradeId));
  const [busy, setBusy] = useState(false);
  const editing = Boolean(gradeId);

  useEffect(() => {
    if (!gradeId) {
      return;
    }

    const currentGradeId = gradeId;
    let mounted = true;

    async function loadGrade() {
      try {
        const grade = await getAdminGrade(currentGradeId);

        if (!mounted) {
          return;
        }

        if (!grade) {
          setError("Ce grade est introuvable.");
          return;
        }

        setForm({
          badge: grade.badge ?? "sparkles",
          description: grade.description ?? "",
          display_order: grade.display_order,
          id: grade.id,
          name: grade.name,
          required_goals: grade.required_goals,
          slug: grade.slug,
        });
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Le grade ne peut pas être chargé.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadGrade();

    return () => {
      mounted = false;
    };
  }, [gradeId]);

  async function submitGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await saveAdminGrade({
      ...form,
      badge: form.badge || null,
      description: form.description || null,
      id: form.id || undefined,
      slug: form.slug || undefined,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);

    if (!editing) {
      setForm(emptyGrade);
    }
  }

  return (
    <>
      <AdminPageHeading
        current={editing ? "Modifier un grade" : "Créer un grade"}
        title={editing ? "Modifier un grade" : "Créer un grade"}
        description="Paliers de progression et seuils d’objectifs."
        action={<AdminBackLink href="/admin/grades">Retour aux grades</AdminBackLink>}
      />
      <AdminNotice message={message} />
      <AdminNotice message={error} tone="error" />

      <AdminCard className="p-6">
        {loading ? (
          <div className="h-80 animate-pulse rounded-2xl bg-gray-100" />
        ) : (
          <form onSubmit={submitGrade} className="grid gap-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <AdminField
                label="Nom"
                value={form.name}
                onChange={(name) =>
                  setForm((current) => ({ ...current, name }))
                }
              />
              <AdminField
                label="Slug"
                value={form.slug}
                onChange={(slug) =>
                  setForm((current) => ({ ...current, slug }))
                }
              />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <AdminField
                label="Objectifs requis"
                min={0}
                type="number"
                value={form.required_goals}
                onChange={(required_goals) =>
                  setForm((current) => ({
                    ...current,
                    required_goals: Number(required_goals),
                  }))
                }
              />
              <AdminField
                label="Ordre"
                type="number"
                value={form.display_order}
                onChange={(display_order) =>
                  setForm((current) => ({
                    ...current,
                    display_order: Number(display_order),
                  }))
                }
              />
            </div>
            <label className="block text-sm font-medium text-gray-700">
              Icône
              <select
                value={form.badge}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    badge: event.target.value,
                  }))
                }
                className={adminFieldClassName}
              >
                {gradeIconOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <AdminField
              label="Description"
              textarea
              rows={4}
              value={form.description}
              onChange={(description) =>
                setForm((current) => ({ ...current, description }))
              }
            />
            <div className="flex flex-wrap gap-3">
              <AdminButton type="submit" disabled={busy}>
                Enregistrer
              </AdminButton>
              <AdminBackLink href="/admin/grades">Annuler</AdminBackLink>
            </div>
          </form>
        )}
      </AdminCard>
    </>
  );
}
