"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  deleteAdminQuizQuestion,
  getAdminQuizQuestion,
  type AdminQuizQuestion,
} from "@/lib/admin";
import { quizDifficultyLabels } from "@/lib/quizShared";
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

export default function AdminQuizQuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [question, setQuestion] = useState<AdminQuizQuestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setQuestion(await getAdminQuizQuestion(params.id));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Cette question ne peut pas être chargée.",
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadQuestion();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadQuestion]);

  async function removeQuestion() {
    if (!question || !window.confirm("Supprimer cette question quiz ?")) {
      return;
    }

    setDeleting(true);
    setError(null);

    const result = await deleteAdminQuizQuestion(question.id);

    setDeleting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    router.push("/admin/quizzes?deleted=1");
    router.refresh();
  }

  return (
    <>
      <AdminPageHeading
        current="Quiz Question"
        title="Détail de la question"
        description="Consultation d'une question de révision."
        action={
          <div className="flex flex-wrap gap-3">
            <AdminBackLink href="/admin/quizzes">Retour aux questions</AdminBackLink>
            {question ? (
              <Link
                href={`/admin/quizzes/${question.id}/edit`}
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
      ) : !question ? (
        <AdminCard className="p-6 text-sm text-gray-500">
          Aucune question ne correspond à cette fiche.
        </AdminCard>
      ) : (
        <AdminCard className="p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  question.is_active
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {question.is_active ? "Active" : "Inactive"}
              </span>
              <h2 className="mt-4 max-w-3xl text-2xl font-semibold text-gray-800">
                {question.question}
              </h2>
            </div>
            <button
              type="button"
              onClick={removeQuestion}
              disabled={deleting}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Supprimer
            </button>
          </div>

          <AdminAttributeList className="mt-6">
            <AdminAttributeRow label="ID" value={question.id} />
            <AdminAttributeRow label="Question" value={question.question} />
            <AdminAttributeRow
              label="Difficulté"
              technicalName="difficulty"
              value={quizDifficultyLabels[question.difficulty]}
            />
            <AdminAttributeRow
              label="Réponse correcte"
              technicalName="correct_answer"
              value={question.correct_answer}
            />
            <AdminAttributeRow
              label="Réponse incorrecte 1"
              technicalName="wrong_answer_1"
              value={question.wrong_answer_1}
            />
            <AdminAttributeRow
              label="Réponse incorrecte 2"
              technicalName="wrong_answer_2"
              value={question.wrong_answer_2}
            />
            <AdminAttributeRow
              label="Réponse incorrecte 3"
              technicalName="wrong_answer_3"
              value={question.wrong_answer_3}
            />
            <AdminAttributeRow
              label="Fait associé"
              technicalName="fact_id"
              value={
                question.facts ? (
                  <Link
                    href={`/admin/facts/${question.facts.id}`}
                    className="text-[#465fff] hover:underline"
                  >
                    {question.facts.title}
                  </Link>
                ) : (
                  "Question indépendante"
                )
              }
            />
            <AdminAttributeRow
              label="Statut"
              technicalName="is_active"
              value={question.is_active ? "Active" : "Inactive"}
            />
            <AdminAttributeRow
              label="Créé le"
              technicalName="created_at"
              value={formatDate(question.created_at)}
            />
            <AdminAttributeRow
              label="Édité le"
              technicalName="updated_at"
              value={formatDate(question.updated_at)}
            />
          </AdminAttributeList>
        </AdminCard>
      )}
    </>
  );
}
