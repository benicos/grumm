"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  FACT_STATUS_LABELS,
  getAdminFact,
  getAdminFacts,
  saveAdminFact,
  type AdminCategory,
  type AdminFact,
  type FactStatus,
} from "@/lib/admin";
import { hasPermission } from "@/lib/roles";
import { useAuth } from "../../auth/AuthProvider";
import { AdminBackLink, AdminField, adminFieldClassName } from "../forms";
import {
  AdminButton,
  AdminCard,
  AdminNotice,
  AdminPageHeading,
} from "../ui";

type FactFormState = {
  advancedSlug: string;
  category_id: string;
  content: string;
  hook: string;
  id: string;
  long_content: string;
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

function getEmptyFact(canPublish: boolean): FactFormState {
  return {
    advancedSlug: "",
    category_id: "",
    content: "",
    hook: "",
    id: "",
    long_content: "",
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
    long_content: fact.long_content ?? "",
    source: fact.source,
    source_url: fact.source_url ?? "",
    status: fact.status,
    title: fact.title,
  };
}

export default function FactEditor({ factId }: { factId?: string }) {
  const { profile } = useAuth();
  const canPublish = hasPermission(profile, "facts.publish");
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<FactFormState>(() =>
    getEmptyFact(canPublish),
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const editing = Boolean(factId);

  useEffect(() => {
    let mounted = true;

    async function loadFact() {
      try {
        const result = factId
          ? await getAdminFact(factId)
          : await getAdminFacts({ pageSize: 1 });

        if (!mounted) {
          return;
        }

        setCategories(result.categories);

        if ("fact" in result && result.fact) {
          setForm(factToForm(result.fact));
          return;
        }

        if ("fact" in result && !result.fact) {
          setError("Ce fait est introuvable.");
        }

        setForm({
          ...getEmptyFact(canPublish),
          category_id: result.categories[0]?.id ?? "",
        });
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Le formulaire du fait ne peut pas être chargé.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadFact();

    return () => {
      mounted = false;
    };
  }, [canPublish, factId]);

  async function submitFact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await saveAdminFact({
      ...form,
      advancedSlug: form.advancedSlug || undefined,
      id: form.id || undefined,
      long_content: form.long_content || null,
      source_url: form.source_url || null,
      status: canPublish ? form.status : undefined,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);

    if (!editing) {
      setForm({
        ...getEmptyFact(canPublish),
        category_id: form.category_id,
      });
    }
  }

  return (
    <>
      <AdminPageHeading
        current={editing ? "Modifier un fait" : "Créer un fait"}
        title={editing ? "Modifier un fait" : "Créer un fait"}
        description={
          canPublish
            ? "Contenu court, lecture longue et statut de publication."
            : "Les nouveaux faits sont envoyés en validation."
        }
        action={<AdminBackLink href="/admin/facts">Retour aux faits</AdminBackLink>}
      />
      <AdminNotice message={message} />
      <AdminNotice message={error} tone="error" />

      <AdminCard className="p-6">
        {loading ? (
          <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
        ) : (
          <form onSubmit={submitFact} className="grid gap-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <AdminField
                label="Titre"
                value={form.title}
                onChange={(title) =>
                  setForm((current) => ({ ...current, title }))
                }
              />
              <AdminField
                label="Accroche"
                value={form.hook}
                onChange={(hook) =>
                  setForm((current) => ({ ...current, hook }))
                }
              />
            </div>

            <AdminField
              label="Contenu court"
              textarea
              value={form.content}
              onChange={(content) =>
                setForm((current) => ({ ...current, content }))
              }
            />
            <AdminField
              label="Contenu long"
              textarea
              rows={8}
              value={form.long_content}
              onChange={(long_content) =>
                setForm((current) => ({ ...current, long_content }))
              }
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Thème
                <select
                  value={form.category_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category_id: event.target.value,
                    }))
                  }
                  className={adminFieldClassName}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              {canPublish ? (
                <label className="block text-sm font-medium text-gray-700">
                  Statut
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as FactStatus,
                      }))
                    }
                    className={adminFieldClassName}
                  >
                    {factStatuses.map((status) => (
                      <option key={status} value={status}>
                        {FACT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Statut automatique : en attente de validation.
                </p>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <AdminField
                label="Source"
                value={form.source}
                onChange={(source) =>
                  setForm((current) => ({ ...current, source }))
                }
              />
              <AdminField
                label="URL de la source"
                type="url"
                value={form.source_url}
                onChange={(source_url) =>
                  setForm((current) => ({ ...current, source_url }))
                }
              />
            </div>

            <AdminField
              label="Slug personnalisé"
              value={form.advancedSlug}
              onChange={(advancedSlug) =>
                setForm((current) => ({ ...current, advancedSlug }))
              }
            />

            <div className="flex flex-wrap gap-3">
              <AdminButton type="submit" disabled={busy}>
                {canPublish ? "Enregistrer" : "Envoyer en validation"}
              </AdminButton>
              <AdminBackLink href="/admin/facts">Annuler</AdminBackLink>
            </div>
          </form>
        )}
      </AdminCard>
    </>
  );
}
