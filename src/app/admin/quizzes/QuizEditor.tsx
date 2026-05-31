"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminQuizQuestion,
  saveAdminQuizQuestion,
  searchAdminFactOptions,
} from "@/lib/admin";
import { AdminBackLink, AdminField, adminFieldClassName } from "../forms";
import {
  AdminButton,
  AdminCard,
  AdminNotice,
  AdminPageHeading,
} from "../ui";

type FactOption = {
  categoryName: string | null;
  id: string;
  title: string;
};

type QuizFormState = {
  correct_answer: string;
  fact_id: string;
  fact_label: string;
  id: string;
  is_active: boolean;
  question: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
};

const emptyQuiz: QuizFormState = {
  correct_answer: "",
  fact_id: "",
  fact_label: "",
  id: "",
  is_active: true,
  question: "",
  wrong_answer_1: "",
  wrong_answer_2: "",
  wrong_answer_3: "",
};

export default function QuizEditor({ questionId }: { questionId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<QuizFormState>(emptyQuiz);
  const [factQuery, setFactQuery] = useState("");
  const [factOptions, setFactOptions] = useState<FactOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(questionId));
  const [busy, setBusy] = useState(false);
  const editing = Boolean(questionId);

  useEffect(() => {
    if (!questionId) {
      return;
    }

    const currentQuestionId = questionId;
    let mounted = true;

    async function loadQuestion() {
      try {
        const question = await getAdminQuizQuestion(currentQuestionId);

        if (!mounted) {
          return;
        }

        if (!question) {
          setError("Cette question est introuvable.");
          return;
        }

        setForm({
          correct_answer: question.correct_answer,
          fact_id: question.fact_id ?? "",
          fact_label: question.facts?.title ?? "",
          id: question.id,
          is_active: question.is_active,
          question: question.question,
          wrong_answer_1: question.wrong_answer_1,
          wrong_answer_2: question.wrong_answer_2,
          wrong_answer_3: question.wrong_answer_3,
        });
        setFactQuery(question.facts?.title ?? "");
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "La question ne peut pas être chargée.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadQuestion();

    return () => {
      mounted = false;
    };
  }, [questionId]);

  useEffect(() => {
    let mounted = true;
    const timeout = window.setTimeout(() => {
      if (factQuery.trim().length < 2) {
        setFactOptions([]);
        return;
      }

      void searchAdminFactOptions(factQuery).then((options) => {
        if (mounted) {
          setFactOptions(options);
        }
      });
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
    };
  }, [factQuery]);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    const result = await saveAdminQuizQuestion({
      correct_answer: form.correct_answer,
      fact_id: form.fact_id || null,
      id: form.id || undefined,
      is_active: form.is_active,
      question: form.question,
      wrong_answer_1: form.wrong_answer_1,
      wrong_answer_2: form.wrong_answer_2,
      wrong_answer_3: form.wrong_answer_3,
    });

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push(`/admin/quizzes?${editing ? "updated" : "created"}=1`);
    router.refresh();

    if (!editing) {
      setForm(emptyQuiz);
      setFactQuery("");
      setFactOptions([]);
    }
  }

  return (
    <>
      <AdminPageHeading
        current={editing ? "Modifier une question" : "Créer une question"}
        title={editing ? "Modifier une question quiz" : "Créer une question quiz"}
        description="Question, réponses et liaison optionnelle avec un fait."
        action={<AdminBackLink href="/admin/quizzes">Retour aux questions</AdminBackLink>}
      />
      <AdminNotice message={message} />
      <AdminNotice message={error} tone="error" />

      <AdminCard className="p-6">
        {loading ? (
          <div className="h-72 animate-pulse rounded-2xl bg-gray-100" />
        ) : (
          <form onSubmit={submitQuestion} className="grid gap-5">
            <AdminField
              label="Question"
              textarea
              rows={3}
              value={form.question}
              onChange={(question) =>
                setForm((current) => ({ ...current, question }))
              }
            />

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <label className="block text-sm font-medium text-gray-700">
                Fait associé (optionnel)
                <input
                  value={factQuery}
                  onChange={(event) => {
                    setFactQuery(event.target.value);
                    setForm((current) => ({
                      ...current,
                      fact_id: "",
                      fact_label: "",
                    }));
                  }}
                  placeholder="Rechercher un titre de fait..."
                  className={adminFieldClassName}
                />
              </label>
              {form.fact_id ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#465fff]/20 bg-white px-3 py-2 text-sm">
                  <span className="font-medium text-gray-800">
                    {form.fact_label}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((current) => ({
                        ...current,
                        fact_id: "",
                        fact_label: "",
                      }));
                      setFactQuery("");
                    }}
                    className="font-medium text-[#465fff]"
                  >
                    Retirer
                  </button>
                </div>
              ) : factOptions.length > 0 ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  {factOptions.map((fact) => (
                    <button
                      key={fact.id}
                      type="button"
                      onClick={() => {
                        setForm((current) => ({
                          ...current,
                          fact_id: fact.id,
                          fact_label: fact.title,
                        }));
                        setFactQuery(fact.title);
                        setFactOptions([]);
                      }}
                      className="flex w-full items-center justify-between gap-4 border-b border-gray-100 px-4 py-3 text-left text-sm transition last:border-b-0 hover:bg-gray-50"
                    >
                      <span className="font-medium text-gray-800">
                        {fact.title}
                      </span>
                      {fact.categoryName ? (
                        <span className="shrink-0 text-xs text-gray-500">
                          {fact.categoryName}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Laisse vide pour créer une question indépendante.
                </p>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <AdminField
                label="Réponse correcte"
                value={form.correct_answer}
                onChange={(correct_answer) =>
                  setForm((current) => ({ ...current, correct_answer }))
                }
              />
              <AdminField
                label="Réponse incorrecte 1"
                value={form.wrong_answer_1}
                onChange={(wrong_answer_1) =>
                  setForm((current) => ({ ...current, wrong_answer_1 }))
                }
              />
              <AdminField
                label="Réponse incorrecte 2"
                value={form.wrong_answer_2}
                onChange={(wrong_answer_2) =>
                  setForm((current) => ({ ...current, wrong_answer_2 }))
                }
              />
              <AdminField
                label="Réponse incorrecte 3"
                value={form.wrong_answer_3}
                onChange={(wrong_answer_3) =>
                  setForm((current) => ({ ...current, wrong_answer_3 }))
                }
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm font-medium text-gray-700">
              <input
                checked={form.is_active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    is_active: event.target.checked,
                  }))
                }
                type="checkbox"
                className="h-4 w-4 accent-[#465fff]"
              />
              Question active
            </label>

            <div className="flex flex-wrap gap-3">
              <AdminButton type="submit" disabled={busy}>
                Enregistrer
              </AdminButton>
              <AdminBackLink href="/admin/quizzes">Annuler</AdminBackLink>
            </div>
          </form>
        )}
      </AdminCard>
    </>
  );
}
