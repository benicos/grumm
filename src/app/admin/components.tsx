"use client";

export function AdminPageHeader({
  action,
  description,
  eyebrow,
  title,
}: {
  action?: React.ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function AdminPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-800 bg-slate-950 shadow-xl ${className}`}>
      {children}
    </section>
  );
}

export function AdminMessage({
  message,
  tone = "info",
}: {
  message: string | null;
  tone?: "info" | "error" | "success";
}) {
  if (!message) {
    return null;
  }

  const classes = {
    error: "border-red-400/25 bg-red-500/10 text-red-100",
    info: "border-slate-700 bg-slate-900 text-slate-200",
    success: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100",
  };

  return (
    <p className={`mb-4 rounded-md border px-4 py-3 text-sm font-semibold ${classes[tone]}`}>
      {message}
    </p>
  );
}

export function AdminButton({
  children,
  disabled,
  onClick,
  tone = "primary",
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
}) {
  const classes = {
    danger:
      "border border-red-400/30 bg-red-500/10 text-red-100 hover:bg-red-500/15",
    primary: "bg-amber-300 text-slate-950 hover:bg-amber-200",
    secondary:
      "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-4 py-2 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-55 ${classes[tone]}`}
    >
      {children}
    </button>
  );
}

export function AdminSearch({
  onChange,
  placeholder = "Rechercher...",
  value,
}: {
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300"
    />
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
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-4 py-3 text-sm text-slate-400">
      <span>
        Page {page} / {pageCount} - {total} resultats
      </span>
      <div className="flex gap-2">
        <AdminButton
          tone="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Precedent
        </AdminButton>
        <AdminButton
          tone="secondary"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
        </AdminButton>
      </div>
    </div>
  );
}

export function AdminTableEmpty({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400">
      {label}
    </div>
  );
}

export function AdminLoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-md bg-slate-900" />
      ))}
    </div>
  );
}
