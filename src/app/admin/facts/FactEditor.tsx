"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  FACT_STATUS_LABELS,
  getAdminFact,
  getAdminFacts,
  saveAdminFact,
} from "@/lib/admin";
import type { AdminCategory, AdminFact, FactStatus } from "@/lib/admin";
import { hasPermission } from "@/lib/roles";
import { useAuth } from "../../auth/AuthProvider";
import {
  AdminButton,
  AdminMessage,
  AdminPageHeader,
  AdminPanel,
} from "../components";

type FactFormState = {
  advancedSlug: string;
  category_id: string;
  content: string;
  hook: string;
  id: string;
  source: string;
  source_url: string;
  status: FactStatus;
  title: string;
};

const factStatuses: FactStatus[] = [
  "pending_review",
  "published",
  "draft",
  "rejected",
  "archived",
];

function emptyFact(canPublish: boolean): FactFormState {
  return {
    advancedSlug: "",
    category_id: "",
    content: "",
    hook: "",
    id: "",
    source: "",
    source_url: "",
    status: canPublish ? "published" : "pending_review",
    title: "",
  };
}

function factToForm(fact: AdminFact): FactFormState {
  return {
    advancedSlug: fact.slug,
    category_id: fact.category_id,
    content: fact.content,
    hook: fact.hook ?? "",
    id: fact.id,
    source: fact.source,
    source_url: fact.source_url ?? "",
    status: fact.status,
    title: fact.title,
  };
}

function Field({
  label,
  onChange,
  textarea,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-300">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2 min-h-36 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
        />
      )}
    </label>
  );
}

export default function FactEditor({ factId }: { factId?: string }) {
  const { profile } = useAuth();
  const canPublish = hasPermission(profile, "facts.publish");
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<FactFormState>(() => emptyFact(canPublish));
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(factId);

  useEffect(() => {
    let isMounted = true;
    const currentFactId = factId;

    async function loadForm() {
      try {
        if (currentFactId) {
          const result = await getAdminFact(currentFactId);

          if (!isMounted) {
            return;
          }

          setCategories(result.categories);
          setForm(
            result.fact
              ? factToForm(result.fact)
              : {
                  ...emptyFact(canPublish),
                  category_id: result.categories[0]?.id ?? "",
                },
          );
        } else {
          const result = await getAdminFacts({ pageSize: 1 });

          if (!isMounted) {
            return;
          }

          setCategories(result.categories);
          setForm({
            ...emptyFact(canPublish),
            category_id: result.categories[0]?.id ?? "",
          });
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger le formulaire.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadForm();

    return () => {
      isMounted = false;
    };
  }, [canPublish, factId]);

  async function submitFact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setMessage(null);
    setError(null);

    const result = await saveAdminFact({
      ...form,
      advancedSlug: form.advancedSlug || undefined,
      id: form.id || undefined,
      source_url: form.source_url || null,
      status: canPublish ? form.status : undefined,
    });

    setIsBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);

    if (!isEditing) {
      setForm({
        ...emptyFact(canPublish),
        category_id: form.category_id,
      });
    }
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Contenu"
        title={isEditing ? "Modifier un fait" : "Créer un fait"}
        description={
          canPublish
            ? "Edition complete avec statut de publication."
            : "Les nouveaux faits sont envoyes en validation."
        }
        action={
          <Link
            href="/admin/facts"
            className="rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
          >
            Retour aux faits
          </Link>
        }
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <AdminPanel className="p-5">
        {isLoading ? (
          <div className="h-96 animate-pulse rounded-md bg-slate-900" />
        ) : (
          <form onSubmit={submitFact} className="grid gap-5">
            {isEditing && (
              <div className="rounded-md border border-slate-800 bg-slate-900 p-3 text-xs text-slate-400">
                Statut actuel :{" "}
                <span className="font-bold text-slate-200">
                  {FACT_STATUS_LABELS[form.status]}
                </span>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <Field
                label="Titre"
                value={form.title}
                onChange={(value) =>
                  setForm((current) => ({ ...current, title: value }))
                }
              />
              <Field
                label="Hook"
                value={form.hook}
                onChange={(value) =>
                  setForm((current) => ({ ...current, hook: value }))
                }
              />
            </div>

            <Field
              label="Contenu"
              textarea
              value={form.content}
              onChange={(value) =>
                setForm((current) => ({ ...current, content: value }))
              }
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-slate-300">Thème</span>
                <select
                  value={form.category_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category_id: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              {canPublish ? (
                <label className="block">
                  <span className="text-sm font-bold text-slate-300">Statut</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as FactStatus,
                      }))
                    }
                    className="mt-2 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300"
                  >
                    {factStatuses.map((status) => (
                      <option key={status} value={status}>
                        {FACT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
                  Statut automatique : en attente de validation.
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Field
                label="Source"
                value={form.source}
                onChange={(value) =>
                  setForm((current) => ({ ...current, source: value }))
                }
              />
              <Field
                label="URL source"
                type="url"
                value={form.source_url}
                onChange={(value) =>
                  setForm((current) => ({ ...current, source_url: value }))
                }
              />
            </div>

            <details className="rounded-md border border-slate-800 bg-slate-900 p-3">
              <summary className="cursor-pointer text-sm font-bold text-slate-300">
                Options avancees
              </summary>
              <div className="mt-3">
                <Field
                  label="Slug force"
                  value={form.advancedSlug}
                  onChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      advancedSlug: value,
                    }))
                  }
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Laisse vide pour regenerer automatiquement depuis le titre.
                </p>
              </div>
            </details>

            <div className="flex flex-wrap gap-3">
              <AdminButton type="submit" disabled={isBusy}>
                {canPublish ? "Enregistrer" : "Envoyer en validation"}
              </AdminButton>
              <Link
                href="/admin/facts"
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
