"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ChevronRight,
  CirclePlus,
  Eye,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";

export type AdminTableColumn<Row> = {
  key: string;
  label: string;
  render: (row: Row) => React.ReactNode;
};

export type AdminRowActions<Row> = {
  onDelete?: (row: Row) => void;
  onEdit?: (row: Row) => void;
  onView?: (row: Row) => void;
};

export function AdminBreadcrumb({
  current,
}: {
  current: string;
}) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/admin" className="transition hover:text-gray-800">
            Accueil
          </Link>
        </li>
        <li aria-hidden="true">
          <ChevronRight className="h-4 w-4" />
        </li>
        <li className="font-medium text-gray-800">{current}</li>
      </ol>
    </nav>
  );
}

export function AdminButton({
  children,
  disabled = false,
  icon: Icon = CirclePlus,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  icon?: LucideIcon;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#465fff] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#3641f5] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </button>
  );
}

export function AdminCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function AdminPageHeading({
  action,
  current,
  description,
  title,
}: {
  action?: React.ReactNode;
  current: string;
  description?: string;
  title: string;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <AdminBreadcrumb current={current} />
        <h1 className="mt-3 text-2xl font-semibold text-gray-800">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function AdminNotice({
  message,
  tone = "info",
}: {
  message: string | null;
  tone?: "error" | "info";
}) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-blue-200 bg-blue-50 text-blue-700"
      }`}
    >
      {message}
    </p>
  );
}

export function AdminWarningAlert({
  action,
  message,
  title,
}: {
  action?: React.ReactNode;
  message: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-amber-800">{message}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function AdminMetricCard({
  icon: Icon,
  label,
  meta,
  value,
}: {
  icon: LucideIcon;
  label: string;
  meta: string;
  value: number | string;
}) {
  return (
    <AdminCard className="p-5 md:p-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-800">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <span className="text-sm text-gray-500">{label}</span>
          <h2 className="mt-2 text-2xl font-bold text-gray-800">
            {value}
          </h2>
        </div>
        <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-600">
          {meta}
        </span>
      </div>
    </AdminCard>
  );
}

export function AdminSearchField({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="relative block w-full max-w-[360px]">
      <span className="sr-only">{placeholder}</span>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
        aria-hidden="true"
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#465fff]"
      />
    </label>
  );
}

export function AdminTable<Row>({
  actions,
  columns,
  empty,
  rows,
  rowKey,
}: {
  actions?: AdminRowActions<Row>;
  columns: AdminTableColumn<Row>[];
  empty: string;
  rows: Row[];
  rowKey: (row: Row) => string;
}) {
  const hasActions = Boolean(actions);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-5 py-3 font-medium text-gray-500"
                >
                  {column.label}
                </th>
              ))}
              {hasActions ? (
                <th className="px-5 py-3 text-right font-medium text-gray-500">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={rowKey(row)} className="transition hover:bg-gray-50/80">
                  {columns.map((column) => (
                    <td key={column.key} className="px-5 py-4 text-gray-700">
                      {column.render(row)}
                    </td>
                  ))}
                  {hasActions ? (
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <AdminTableAction
                          label="Voir"
                          onClick={() => actions?.onView?.(row)}
                          icon={Eye}
                        />
                        <AdminTableAction
                          label="Modifier"
                          onClick={() => actions?.onEdit?.(row)}
                          icon={Pencil}
                        />
                        <AdminTableAction
                          label="Supprimer"
                          onClick={() => actions?.onDelete?.(row)}
                          icon={Trash2}
                          tone="danger"
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className="px-5 py-12 text-center text-sm text-gray-500"
                >
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminPager({
  onPageChange,
  page,
  pageSize,
  total,
}: {
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-5 py-4 text-sm sm:flex-row sm:items-center">
      <span className="text-gray-500">
        Page {page} sur {pages} - {total} résultats
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-9 rounded-lg border border-gray-200 px-3 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Précédent
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="h-9 rounded-lg border border-gray-200 px-3 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}

function AdminTableAction({
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  tone?: "danger" | "default";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
        !onClick
          ? "cursor-not-allowed border-gray-100 text-gray-300"
          : tone === "danger"
          ? "border-red-100 text-red-500 hover:bg-red-50"
          : "border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export function AdminTableSkeleton() {
  return (
    <AdminCard className="overflow-hidden">
      <div className="space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-12 animate-pulse rounded-xl bg-gray-100"
          />
        ))}
      </div>
    </AdminCard>
  );
}

export function AdminLineChart({
  description,
  points,
  title,
}: {
  description: string;
  points: { current: number; label: string; previous: number }[];
  title: string;
}) {
  const width = 760;
  const height = 280;
  const padding = { bottom: 42, left: 44, right: 16, top: 20 };
  const plotHeight = height - padding.top - padding.bottom;
  const plotWidth = width - padding.left - padding.right;
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) => [point.current, point.previous]),
  );
  const steps = points.length > 1 ? points.length - 1 : 1;

  function getX(index: number) {
    return padding.left + (plotWidth * index) / steps;
  }

  function getY(value: number) {
    return padding.top + plotHeight - (plotHeight * value) / maxValue;
  }

  function getPath(key: "current" | "previous") {
    return points
      .map((point, index) => {
        const command = index === 0 ? "M" : "L";
        return `${command} ${getX(index).toFixed(1)} ${getY(point[key]).toFixed(1)}`;
      })
      .join(" ");
  }

  const currentPath = getPath("current");
  const previousPath = getPath("previous");
  const areaPath = points.length
    ? `${currentPath} L ${getX(points.length - 1).toFixed(1)} ${(
        padding.top + plotHeight
      ).toFixed(1)} L ${getX(0).toFixed(1)} ${(
        padding.top + plotHeight
      ).toFixed(1)} Z`
    : "";
  const yTicks = Array.from({ length: 4 }, (_, index) =>
    Math.round((maxValue * index) / 3),
  );
  const labelStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <AdminCard className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-medium text-gray-500">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#465fff]" />
            Période actuelle
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
            Période précédente
          </span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-100 bg-gray-50/60">
        {points.length > 0 ? (
          <svg
            aria-label={title}
            className="h-auto min-w-[620px] w-full"
            role="img"
            viewBox={`0 0 ${width} ${height}`}
          >
            <defs>
              <linearGradient id={`chart-${title.replace(/\W+/g, "-")}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#465fff" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#465fff" stopOpacity="0" />
              </linearGradient>
            </defs>
            {yTicks.map((tick) => {
              const y = getY(tick);

              return (
                <g key={tick}>
                  <line
                    stroke="#e5e7eb"
                    strokeDasharray="4 4"
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y}
                    y2={y}
                  />
                  <text
                    fill="#6b7280"
                    fontSize="11"
                    textAnchor="end"
                    x={padding.left - 10}
                    y={y + 4}
                  >
                    {tick}
                  </text>
                </g>
              );
            })}
            <path d={areaPath} fill={`url(#chart-${title.replace(/\W+/g, "-")})`} />
            <path
              d={previousPath}
              fill="none"
              stroke="#cbd5e1"
              strokeDasharray="6 6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d={currentPath}
              fill="none"
              stroke="#465fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            {points.map((point, index) =>
              index % labelStep === 0 || index === points.length - 1 ? (
                <text
                  key={`${point.label}-${index}`}
                  fill="#6b7280"
                  fontSize="11"
                  textAnchor="middle"
                  x={getX(index)}
                  y={height - 14}
                >
                  {point.label}
                </text>
              ) : null,
            )}
          </svg>
        ) : (
          <p className="px-5 py-16 text-center text-sm text-gray-500">
            Aucune donnée disponible pour ce graphique.
          </p>
        )}
      </div>
    </AdminCard>
  );
}
