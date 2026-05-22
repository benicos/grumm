"use client";

import { useRouter } from "next/navigation";
import { deleteAdminGrade, getAdminGrades, type AdminGrade } from "@/lib/admin";
import AdminListingPage from "../AdminListingPage";

function loadGrades({
  page,
  pageSize,
  query,
}: {
  page: number;
  pageSize: number;
  query: string;
}) {
  return getAdminGrades({ page, pageSize, query });
}

export default function AdminGradesPage() {
  const router = useRouter();

  return (
    <AdminListingPage<AdminGrade>
      current="Grades"
      entity="grades"
      title="Grades"
      description="Paliers de progression disponibles."
      actionLabel="Ajouter un grade"
      actionHref="/admin/grades/create"
      searchPlaceholder="Rechercher des grades..."
      empty="Aucun grade trouvé."
      loadRows={loadGrades}
      rowKey={(grade) => grade.id}
      actions={{
        onDelete: (grade) => {
          if (window.confirm(`Supprimer le grade "${grade.name}" ?`)) {
            void deleteAdminGrade(grade.id).then(() => router.refresh());
          }
        },
        onEdit: (grade) => router.push(`/admin/grades/${grade.id}`),
        onView: (grade) => router.push(`/admin/grades/${grade.id}`),
      }}
      columns={[
        {
          key: "grade",
          label: "Grade",
          render: (grade) => (
            <div>
              <p className="font-medium text-gray-800">{grade.name}</p>
              <p className="mt-1 text-xs text-gray-500">{grade.slug}</p>
            </div>
          ),
        },
        {
          key: "goals",
          label: "Objectifs requis",
          render: (grade) => grade.required_goals,
        },
        {
          key: "order",
          label: "Ordre",
          render: (grade) => grade.display_order,
        },
        {
          key: "type",
          label: "Type",
          render: (grade) => (grade.is_system ? "Système" : "Personnalisé"),
        },
      ]}
    />
  );
}
