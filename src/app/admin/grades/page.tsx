"use client";

import { useRouter } from "next/navigation";
import { deleteAdminGrade, getAdminGrades, type AdminGrade } from "@/lib/admin";
import AdminListingPage, {
  type AdminListingFilterValues,
} from "../AdminListingPage";
import GradeIcon from "../../components/GradeIcon";

function loadGrades({
  page,
  pageSize,
  query,
  filters,
}: {
  filters: AdminListingFilterValues;
  page: number;
  pageSize: number;
  query: string;
}) {
  return getAdminGrades({
    page,
    pageSize,
    query,
    system:
      filters.system === "custom" || filters.system === "system"
        ? filters.system
        : "all",
  });
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
      filters={[
        {
          id: "system",
          label: "Type",
          options: [
            { label: "Tous les grades", value: "all" },
            { label: "Système", value: "system" },
            { label: "Non système", value: "custom" },
          ],
        },
      ]}
      empty="Aucun grade trouvé."
      loadRows={loadGrades}
      rowKey={(grade) => grade.id}
      actions={{
        onDelete: (grade) => {
          if (window.confirm(`Supprimer le grade "${grade.name}" ?`)) {
            void deleteAdminGrade(grade.id).then((result) => {
              if (result.ok) {
                router.push("/admin/grades?deleted=1");
              }
              router.refresh();
            });
          }
        },
        onEdit: (grade) => router.push(`/admin/grades/${grade.id}/edit`),
        onView: (grade) => router.push(`/admin/grades/${grade.id}`),
      }}
      columns={[
        {
          key: "grade",
          label: "Grade",
          render: (grade) => (
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-[#465fff]">
                <GradeIcon badge={grade.badge} className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-gray-800">{grade.name}</p>
                <p className="mt-1 text-xs text-gray-500">{grade.slug}</p>
              </div>
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
