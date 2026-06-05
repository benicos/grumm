"use client";

import { createElement } from "react";
import type { LucideProps } from "lucide-react";
import { getThemeIconComponent, normalizeThemeIconName } from "@/lib/icons";

export function normalizeGradeIcon(value?: string | null) {
  return normalizeThemeIconName(value || "sparkles");
}

export default function GradeIcon({
  badge,
  className = "h-4 w-4",
}: {
  badge?: string | null;
  className?: string;
}) {
  const Icon = getThemeIconComponent(normalizeGradeIcon(badge));

  return createElement(Icon, {
    "aria-hidden": true,
    className,
    strokeWidth: 2.2,
  } satisfies LucideProps & { "aria-hidden": boolean });
}
