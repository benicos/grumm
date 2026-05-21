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
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#465fff]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
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
    <section className={`overflow-hidden rounded-xl border border-[#1d2939] bg-[#101828] shadow-[0_18px_45px_rgba(2,8,23,0.24)] ${className}`}>
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
    info: "border-[#344054] bg-[#1d2939] text-slate-200",
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
    primary: "bg-[#465fff] text-white hover:bg-[#3641f5]",
    secondary:
      "border border-[#344054] bg-[#1d2939] text-slate-200 hover:bg-[#26364c]",
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
      className="w-full rounded-lg border border-[#1d2939] bg-[#101828] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#465fff]"
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
    <div className="flex flex-col gap-3 border-t border-[#1d2939] px-4 py-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Page {page} / {pageCount} - {total} résultats
      </span>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <AdminButton
          tone="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Précédent
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
    <div className="rounded-lg border border-dashed border-[#344054] p-8 text-center text-sm text-slate-400">
      {label}
    </div>
  );
}

export function AdminLoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-lg bg-[#1d2939]" />
      ))}
    </div>
  );
}
