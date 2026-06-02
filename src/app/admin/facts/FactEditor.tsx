"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FACT_STATUS_LABELS,
  getAdminFact,
  getAdminFacts,
  saveAdminFact,
  type AdminCategory,
  type AdminFact,
  type FactStatus,
} from "@/lib/admin";
import {
  type DifficultyLevel,
  difficultyLevelOptions,
} from "@/lib/learning";
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
  category_id: string;
  content: string;
  difficulty_level: DifficultyLevel;
  event_day: string;
  event_month: string;
  event_year: string;
  hook: string;
  id: string;
  long_content: string;
  seo_description: string;
  seo_title: string;
  source: string;
  source_url: string;
  status: FactStatus;
  title: string;
};

type FactQuizFormState = {
  correct_answer: string;
  question: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
};

const factStatuses: FactStatus[] = [
  "pending_review",
  "published",
  "draft",
  "rejected",
  "archived",
];

const emptyQuizForm: FactQuizFormState = {
  correct_answer: "",
  question: "",
  wrong_answer_1: "",
  wrong_answer_2: "",
  wrong_answer_3: "",
};

function getEmptyFact(canPublish: boolean): FactFormState {
  return {
    category_id: "",
    content: "",
    difficulty_level: "intermediate",
    event_day: "",
    event_month: "",
    event_year: "",
    hook: "",
    id: "",
    long_content: "",
    seo_description: "",
    seo_title: "",
    source: "",
    source_url: "",
    status: canPublish ? "published" : "pending_review",
    title: "",
  };
}

function factToForm(fact: AdminFact): FactFormState {
  return {
    category_id: fact.category_id,
    content: fact.content,
    difficulty_level: fact.difficulty_level,
    event_day: fact.event_day ? String(fact.event_day) : "",
    event_month: fact.event_month ? String(fact.event_month) : "",
    event_year: fact.event_year ? String(fact.event_year) : "",
    hook: fact.hook ?? "",
    id: fact.id,
    long_content: fact.long_content ?? "",
    seo_description: fact.seo_description ?? "",
    seo_title: fact.seo_title ?? "",
    source: fact.source ?? "",
    source_url: fact.source_url ?? "",
    status: fact.status,
    title: fact.title,
  };
}

export default function FactEditor({ factId }: { factId?: string }) {
  const router = useRouter();
  const { profile } = useAuth();
  const canPublish = hasPermission(profile, "facts.publish");
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState<FactFormState>(() =>
    getEmptyFact(canPublish),
  );
  const [quizForm, setQuizForm] = useState<FactQuizFormState>(emptyQuizForm);
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
      id: form.id || undefined,
      event_day: form.event_day ? Number(form.event_day) : null,
      event_month: form.event_month ? Number(form.event_month) : null,
      event_year: form.event_year ? Number(form.event_year) : null,
      long_content: form.long_content || null,
      quiz: editing ? null : quizForm,
      seo_description: form.seo_description || null,
      seo_title: form.seo_title || null,
      source_url: form.source_url || null,
      status: canPublish ? form.status : undefined,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push(`/admin/facts?${editing ? "updated" : "created"}=1`);
    router.refresh();

    if (!editing) {
      setForm({
        ...getEmptyFact(canPublish),
        category_id: form.category_id,
      });
      setQuizForm(emptyQuizForm);
    }
  }

  return (
    <>
      <AdminPageHeading
        current={editing ? "Modifier un fait" : "Créer un fait"}
        title={editing ? "Modifier un fait" : "Créer un fait"}
        description={
          canPublish
            ? "Contexte, lecture longue et publication."
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
                required
                value={form.title}
                onChange={(title) =>
                  setForm((current) => ({ ...current, title }))
                }
              />
              <AdminField
                label="Accroche"
                help="Phrase courte utilisée pour le quiz mémoire et certains aperçus."
                value={form.hook}
                onChange={(hook) =>
                  setForm((current) => ({ ...current, hook }))
                }
              />
            </div>

            <AdminField
              label="Contexte"
              help="Texte principal affiché dans le flux de découverte."
              required
              textarea
              value={form.content}
              onChange={(content) =>
                setForm((current) => ({ ...current, content }))
              }
            />
            <AdminField
              label="En savoir plus"
              help="Version enrichie affichée sur la page détaillée du fait."
              textarea
              rows={8}
              value={form.long_content}
              onChange={(long_content) =>
                setForm((current) => ({ ...current, long_content }))
              }
            />

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-gray-800">
                Date éditoriale
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Permet d&apos;associer ce fait à une date importante comme le 14 juillet ou le 20 juillet.
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <AdminField
                  label="Jour"
                  type="number"
                  value={form.event_day}
                  onChange={(event_day) =>
                    setForm((current) => ({ ...current, event_day }))
                  }
                />
                <AdminField
                  label="Mois"
                  type="number"
                  value={form.event_month}
                  onChange={(event_month) =>
                    setForm((current) => ({ ...current, event_month }))
                  }
                />
                <AdminField
                  label="Année"
                  type="number"
                  value={form.event_year}
                  onChange={(event_year) =>
                    setForm((current) => ({ ...current, event_year }))
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-gray-800">SEO</h2>
              <p className="mt-1 text-sm text-gray-500">
                Optionnel. Si ces champs restent vides, Grumm utilise le titre et le contenu du fait.
              </p>
              <div className="mt-5 grid gap-5">
                <AdminField
                  label="Titre SEO"
                  value={form.seo_title}
                  onChange={(seo_title) =>
                    setForm((current) => ({ ...current, seo_title }))
                  }
                />
                <AdminField
                  label="Description SEO"
                  textarea
                  rows={3}
                  value={form.seo_description}
                  onChange={(seo_description) =>
                    setForm((current) => ({ ...current, seo_description }))
                  }
                />
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Thème
                <span className="ml-1 text-red-500" aria-label="obligatoire">
                  *
                </span>
                <select
                  required
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
              {canPublish && editing ? (
                <label className="block text-sm font-medium text-gray-700">
                  Statut
                  <span className="ml-1 text-red-500" aria-label="obligatoire">
                    *
                  </span>
                  <select
                    required
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
              ) : null}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                Niveau
                <span className="ml-1 text-red-500" aria-label="obligatoire">
                  *
                </span>
                <select
                  required
                  value={form.difficulty_level}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      difficulty_level: event.target.value as DifficultyLevel,
                    }))
                  }
                  className={adminFieldClassName}
                >
                  {difficultyLevelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <AdminField
                label="Source (optionnelle)"
                help="Référence utilisée pour vérifier l'information."
                value={form.source}
                onChange={(source) =>
                  setForm((current) => ({ ...current, source }))
                }
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <AdminField
                label="URL de la source"
                help="Lien vers la source originale."
                type="url"
                value={form.source_url}
                onChange={(source_url) =>
                  setForm((current) => ({ ...current, source_url }))
                }
              />
            </div>

            {!editing ? (
              <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <h2 className="text-base font-semibold text-gray-800">
                  Question quiz associée
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Optionnel. Si cette section reste vide, seul le fait sera créé.
                </p>
                <div className="mt-5 grid gap-5">
                  <AdminField
                    label="Question personnalisée"
                    textarea
                    rows={3}
                    value={quizForm.question}
                    onChange={(question) =>
                      setQuizForm((current) => ({ ...current, question }))
                    }
                  />
                  <div className="grid gap-5 lg:grid-cols-2">
                    <AdminField
                      label="Réponse correcte"
                      value={quizForm.correct_answer}
                      onChange={(correct_answer) =>
                        setQuizForm((current) => ({
                          ...current,
                          correct_answer,
                        }))
                      }
                    />
                    <AdminField
                      label="Réponse incorrecte 1"
                      value={quizForm.wrong_answer_1}
                      onChange={(wrong_answer_1) =>
                        setQuizForm((current) => ({
                          ...current,
                          wrong_answer_1,
                        }))
                      }
                    />
                    <AdminField
                      label="Réponse incorrecte 2"
                      value={quizForm.wrong_answer_2}
                      onChange={(wrong_answer_2) =>
                        setQuizForm((current) => ({
                          ...current,
                          wrong_answer_2,
                        }))
                      }
                    />
                    <AdminField
                      label="Réponse incorrecte 3"
                      value={quizForm.wrong_answer_3}
                      onChange={(wrong_answer_3) =>
                        setQuizForm((current) => ({
                          ...current,
                          wrong_answer_3,
                        }))
                      }
                    />
                  </div>
                </div>
              </section>
            ) : null}

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
