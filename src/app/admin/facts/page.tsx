"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  deleteAdminFact,
  FACT_STATUS_LABELS,
  getAdminCategories,
  getAdminFacts,
  type AdminCategory,
  type AdminFact,
  type FactStatus,
} from "@/lib/admin";
import {
  type DifficultyLevel,
  difficultyLevelOptions,
  getDifficultyLevelLabel,
} from "@/lib/learning";
import AdminListingPage, {
  type AdminListingFilterValues,
} from "../AdminListingPage";

const statusValues: FactStatus[] = [
  "archived",
  "draft",
  "pending_review",
  "published",
  "rejected",
];

export default function AdminFactsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const requestedStatus = searchParams.get("status");
  const status = statusValues.find((value) => value === requestedStatus);

  useEffect(() => {
    let mounted = true;

    void getAdminCategories({ pageSize: 50 })
      .then((result) => {
        if (mounted) {
          setCategories(result.items);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const loadFacts = useCallback(
    ({
      filters,
      page,
      pageSize,
      query,
    }: {
      filters: AdminListingFilterValues;
      page: number;
      pageSize: number;
      query: string;
    }) => {
      const difficultyLevel: DifficultyLevel | "all" =
        difficultyLevelOptions.find(
          (option) => option.value === filters.difficulty,
        )?.value ?? "all";

      return getAdminFacts({
        categoryId: filters.category,
        difficultyLevel,
        page,
        pageSize,
        query,
        status: statusValues.find((value) => value === filters.status),
      });
    },
    [],
  );

  return (
    <AdminListingPage<AdminFact>
      current="Faits"
      entity="facts"
      title="Faits"
      description="Liste des faits et de leur statut de publication."
      actionLabel="Ajouter un fait"
      actionHref="/admin/facts/create"
      searchPlaceholder="Rechercher des faits..."
      initialFilterValues={status ? { status } : undefined}
      filters={[
        {
          id: "status",
          label: "Statut",
          options: [
            { label: "Tous les statuts", value: "all" },
            ...statusValues.map((value) => ({
              label: FACT_STATUS_LABELS[value],
              value,
            })),
          ],
        },
        {
          id: "category",
          label: "Thème",
          options: [
            { label: "Tous les thèmes", value: "all" },
            ...categories.map((category) => ({
              label: category.name,
              value: category.id,
            })),
          ],
        },
        {
          id: "difficulty",
          label: "Niveau",
          options: [
            { label: "Tous les niveaux", value: "all" },
            ...difficultyLevelOptions,
          ],
        },
      ]}
      empty="Aucun fait trouvé."
      loadRows={loadFacts}
      rowKey={(fact) => fact.id}
      actions={{
        onDelete: (fact) => {
          if (window.confirm(`Supprimer le fait "${fact.title}" ?`)) {
            void deleteAdminFact(fact.id).then((result) => {
              if (result.ok) {
                router.push("/admin/facts?deleted=1");
              }
              router.refresh();
            });
          }
        },
        onEdit: (fact) => router.push(`/admin/facts/${fact.id}/edit`),
        onView: (fact) => router.push(`/admin/facts/${fact.id}`),
      }}
      columns={[
        {
          key: "fact",
          label: "Fait",
          render: (fact) => (
            <div>
              <p className="font-medium text-gray-800">{fact.title}</p>
              <p className="mt-1 text-xs text-gray-500">{fact.slug}</p>
            </div>
          ),
        },
        {
          key: "theme",
          label: "Thème",
          render: (fact) => fact.categories?.name ?? "-",
        },
        {
          key: "difficulty",
          label: "Niveau",
          render: (fact) => getDifficultyLevelLabel(fact.difficulty_level),
        },
        {
          key: "status",
          label: "Statut",
          render: (fact) => (
            <span className="rounded-full bg-[#ecf3ff] px-2.5 py-1 text-xs font-medium text-[#465fff]">
              {FACT_STATUS_LABELS[fact.status]}
            </span>
          ),
        },
        {
          key: "source",
          label: "Source",
          render: (fact) => fact.source?.trim() || "-",
        },
      ]}
    />
  );
}
