"use client";

import { useRouter } from "next/navigation";
import {
  deleteAdminQuizQuestion,
  getAdminQuizQuestions,
  type AdminQuizQuestion,
} from "@/lib/admin";
import { quizDifficultyLabels, type QuizDifficulty } from "@/lib/quizShared";
import AdminListingPage from "../AdminListingPage";

function loadQuizQuestions({
  filters,
  page,
  pageSize,
  query,
}: {
  filters: Record<string, string>;
  page: number;
  pageSize: number;
  query: string;
}) {
  return getAdminQuizQuestions({
    active: (filters.active as "active" | "all" | "inactive") ?? "all",
    difficulty: (filters.difficulty as QuizDifficulty | "all") ?? "all",
    page,
    pageSize,
    query,
  });
}

export default function AdminQuizQuestionsPage() {
  const router = useRouter();

  return (
    <AdminListingPage<AdminQuizQuestion>
      current="Quiz Questions"
      entity="quizzes"
      title="Quiz Questions"
      description="Questions éditoriales utilisées par le Défi mémoire et les futures expériences de révision."
      actionLabel="Ajouter une question"
      actionHref="/admin/quizzes/create"
      searchPlaceholder="Rechercher une question..."
      empty="Aucune question quiz trouvée."
      filters={[
        {
          id: "active",
          label: "Statut",
          options: [
            { label: "Tous", value: "all" },
            { label: "Actives", value: "active" },
            { label: "Inactives", value: "inactive" },
          ],
        },
        {
          id: "difficulty",
          label: "Difficulté",
          options: [
            { label: "Toutes", value: "all" },
            { label: "Facile", value: "easy" },
            { label: "Standard", value: "standard" },
            { label: "Difficile", value: "hard" },
          ],
        },
      ]}
      loadRows={loadQuizQuestions}
      rowKey={(question) => question.id}
      actions={{
        onDelete: (question) => {
          if (window.confirm("Supprimer cette question quiz ?")) {
            void deleteAdminQuizQuestion(question.id).then((result) => {
              if (result.ok) {
                router.push("/admin/quizzes?deleted=1");
              }
              router.refresh();
            });
          }
        },
        onEdit: (question) => router.push(`/admin/quizzes/${question.id}/edit`),
        onView: (question) => router.push(`/admin/quizzes/${question.id}`),
      }}
      columns={[
        {
          key: "question",
          label: "Question",
          render: (question) => (
            <span className="font-medium text-gray-800">
              {question.question}
            </span>
          ),
        },
        {
          key: "fact",
          label: "Fait associé",
          render: (question) =>
            question.facts ? (
              <span>
                {question.facts.title}
                {question.facts.categories?.name ? (
                  <span className="ml-2 text-xs text-gray-400">
                    {question.facts.categories.name}
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="text-gray-400">Indépendante</span>
            ),
        },
        {
          key: "difficulty",
          label: "Difficulté",
          render: (question) => (
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
              {quizDifficultyLabels[question.difficulty]}
            </span>
          ),
        },
        {
          key: "status",
          label: "Statut",
          render: (question) => (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                question.is_active
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {question.is_active ? "Active" : "Inactive"}
            </span>
          ),
        },
        {
          key: "updated",
          label: "Mise à jour",
          render: (question) =>
            new Date(question.updated_at).toLocaleDateString("fr-FR"),
        },
      ]}
    />
  );
}
