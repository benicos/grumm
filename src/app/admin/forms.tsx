import Link from "next/link";

export const adminFieldClassName =
  "mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#465fff]";

export function AdminField({
  label,
  min,
  onChange,
  rows = 5,
  textarea = false,
  type = "text",
  value,
}: {
  label: string;
  min?: number;
  onChange: (value: string) => void;
  rows?: number;
  textarea?: boolean;
  type?: string;
  value: string | number;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {textarea ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={adminFieldClassName}
        />
      ) : (
        <input
          min={min}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={adminFieldClassName}
        />
      )}
    </label>
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
