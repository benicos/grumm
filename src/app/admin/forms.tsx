import Link from "next/link";

export const adminFieldClassName =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#465fff]";

export function AdminField({
  help,
  label,
  min,
  onChange,
  required = false,
  rows = 5,
  textarea = false,
  type = "text",
  value,
}: {
  help?: string;
  label: string;
  min?: number;
  onChange: (value: string) => void;
  required?: boolean;
  rows?: number;
  textarea?: boolean;
  type?: string;
  value: string | number;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      <span className="inline-flex items-center gap-2">
        {label}
        {help ? <AdminHelpTooltip text={help} /> : null}
      </span>
      {required ? (
        <span className="ml-1 text-red-500" aria-label="obligatoire">
          *
        </span>
      ) : null}
      {textarea ? (
        <textarea
          required={required}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={adminFieldClassName}
        />
      ) : (
        <input
          min={min}
          required={required}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={adminFieldClassName}
        />
      )}
    </label>
  );
}

export function AdminHelpTooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="grid h-5 w-5 place-items-center rounded-full border border-gray-300 bg-white text-xs font-bold text-gray-500 transition hover:border-[#465fff] hover:text-[#465fff]"
        aria-label="Aide"
      >
        ?
      </button>
      <span className="pointer-events-none absolute left-1/2 top-7 z-20 hidden w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-normal leading-5 text-gray-600 shadow-xl group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

export function AdminBackLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
    >
      {children}
    </Link>
  );
}
