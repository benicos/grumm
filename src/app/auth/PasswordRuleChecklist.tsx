"use client";

import { getPasswordRuleResults } from "@/lib/password";

type PasswordRuleChecklistProps = {
  password: string;
};

export default function PasswordRuleChecklist({
  password,
}: PasswordRuleChecklistProps) {
  const rules = getPasswordRuleResults(password);

  return (
    <ul className="mt-3 grid gap-1.5 text-xs font-semibold text-white/52 sm:grid-cols-2">
      {rules.map((rule) => (
        <li
          key={rule.id}
          className={`flex items-center gap-2 transition ${
            rule.valid ? "text-emerald-200" : "text-white/42"
          }`}
        >
          <span
            className={`grid h-4 w-4 place-items-center rounded-full border text-[10px] ${
              rule.valid
                ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-100"
                : "border-white/16 bg-white/[0.04] text-white/34"
            }`}
            aria-hidden="true"
          >
            {rule.valid ? "✓" : ""}
          </span>
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
