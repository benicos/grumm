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

export type AdminListingFilterValues = Record<string, string>;

export type AdminListingFilter = {
  id: string;
  label: string;
  options: {
    label: string;
    value: string;
  }[];
};

export default function AdminListingPage<Row>({
  actionLabel,
  actionHref,
  actions,
  columns,
  current,
  description,
  empty,
  entity,
  filters = [],
  initialFilterValues = {},
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
  filters?: AdminListingFilter[];
  initialFilterValues?: AdminListingFilterValues;
  loadRows: (options: {
    filters: AdminListingFilterValues;
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
  const [filterValues, setFilterValues] = useState<AdminListingFilterValues>(
    initialFilterValues,
  );
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
        const result = await loadRows({
          filters: filterValues,
          page,
          pageSize,
          query,
        });

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
  }, [filterValues, loadRows, page, pageSize, query]);

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
  const hasActiveFilters =
    query.trim().length > 0 ||
    filters.some((filter) => {
      const value = filterValues[filter.id];
      return Boolean(value && value !== "all");
    });

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
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
              <AdminSearchField
                value={query}
                onChange={(value) => {
                  setQuery(value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
              />
              {filters.map((filter) => (
                <label
                  key={filter.id}
                  className="block min-w-[180px] text-sm font-medium text-gray-600"
                >
                  {filter.label}
                  <select
                    value={filterValues[filter.id] ?? "all"}
                    onChange={(event) => {
                      setFilterValues((current) => ({
                        ...current,
                        [filter.id]: event.target.value,
                      }));
                      setPage(1);
                    }}
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-[#465fff]"
                  >
                    {filter.options.map((option) => (
                      <option key={`${filter.id}-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFilterValues({});
                    setPage(1);
                  }}
                  className="h-11 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Réinitialiser
                </button>
              ) : null}
              <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">
                {total} résultats
              </span>
            </div>
          </div>
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
