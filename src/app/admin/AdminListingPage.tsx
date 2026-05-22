"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AdminListResult } from "@/lib/admin";
import {
  AdminButton,
  AdminCard,
  AdminNotice,
  AdminPageHeading,
  AdminPager,
  AdminSearchField,
  AdminTable,
  AdminTableSkeleton,
  type AdminRowActions,
  type AdminTableColumn,
} from "./ui";
import {
  getDefaultColumnKeys,
  readColumnPreferences,
  type AdminEntityKey,
} from "./columns";

export default function AdminListingPage<Row>({
  actionLabel,
  actionHref,
  actions,
  columns,
  current,
  description,
  empty,
  entity,
  loadRows,
  rowKey,
  searchPlaceholder,
  title,
}: {
  actionLabel?: string;
  actionHref?: string;
  actions?: AdminRowActions<Row>;
  columns: AdminTableColumn<Row>[];
  current: string;
  description: string;
  empty: string;
  entity: AdminEntityKey;
  loadRows: (options: {
    page: number;
    pageSize: number;
    query: string;
  }) => Promise<AdminListResult<Row>>;
  rowKey: (row: Row) => string;
  searchPlaceholder: string;
  title: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() =>
    getDefaultColumnKeys(entity),
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const result = await loadRows({ page, pageSize, query });

        if (mounted) {
          setRows(result.items);
          setTotal(result.total);
          setPage(result.page);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Cette liste ne peut pas être chargée pour le moment.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [loadRows, page, pageSize, query]);

  useEffect(() => {
    function syncColumns() {
      const defaultKeys = getDefaultColumnKeys(entity);
      const configuredKeys = readColumnPreferences()[entity] ?? defaultKeys;
      const safeKeys = configuredKeys.filter((key) => defaultKeys.includes(key));

      setVisibleColumnKeys(safeKeys.length > 0 ? safeKeys : defaultKeys);
    }

    syncColumns();
    window.addEventListener("storage", syncColumns);
    window.addEventListener("admin-columns-updated", syncColumns);

    return () => {
      window.removeEventListener("storage", syncColumns);
      window.removeEventListener("admin-columns-updated", syncColumns);
    };
  }, [entity]);

  const visibleColumns = columns.filter((column) =>
    visibleColumnKeys.includes(column.key),
  );

  return (
    <>
      <AdminPageHeading
        current={current}
        title={title}
        description={description}
        action={
          actionHref && actionLabel ? (
            <AdminButton onClick={() => router.push(actionHref)}>
              {actionLabel}
            </AdminButton>
          ) : undefined
        }
      />
      <AdminNotice message={error} tone="error" />

      <AdminCard>
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <AdminSearchField
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
          />
          <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">
            {total} résultats
          </span>
        </div>

        <div className="p-5">
          {loading ? (
            <AdminTableSkeleton />
          ) : (
            <AdminTable
              actions={actions}
              columns={visibleColumns}
              empty={empty}
              rows={rows}
              rowKey={rowKey}
            />
          )}
        </div>

        <AdminPager
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      </AdminCard>
    </>
  );
}
