"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  deleteAdminFact,
  FACT_STATUS_LABELS,
  getAdminFacts,
  type AdminFact,
  type FactStatus,
} from "@/lib/admin";
import AdminListingPage from "../AdminListingPage";

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
  const requestedStatus = searchParams.get("status");
  const status = statusValues.find((value) => value === requestedStatus);
  const loadFacts = useCallback(
    ({
      page,
      pageSize,
      query,
    }: {
      page: number;
      pageSize: number;
      query: string;
    }) => getAdminFacts({ page, pageSize, query, status }),
    [status],
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
      empty="Aucun fait trouvé."
      loadRows={loadFacts}
      rowKey={(fact) => fact.id}
      actions={{
        onDelete: (fact) => {
          if (window.confirm(`Supprimer le fait "${fact.title}" ?`)) {
            void deleteAdminFact(fact.id).then(() => router.refresh());
          }
        },
        onEdit: (fact) => router.push(`/admin/facts/${fact.id}`),
        onView: (fact) =>
          router.push(
            fact.status === "published"
              ? `/fact/${fact.slug}`
              : `/admin/facts/${fact.id}`,
          ),
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
          render: (fact) => fact.source,
        },
      ]}
    />
  );
}
