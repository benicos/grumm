"use client";

import {
  BookOpen,
  Brain,
  Compass,
  Crown,
  Flame,
  Gem,
  Orbit,
  ShieldCheck,
  Sparkles,
  Star,
  Telescope,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { gradeIconOptions, type GradeIconKey } from "@/config/app";

const gradeIcons: Record<GradeIconKey, LucideIcon> = {
  "book-open": BookOpen,
  brain: Brain,
  compass: Compass,
  crown: Crown,
  flame: Flame,
  gem: Gem,
  orbit: Orbit,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  star: Star,
  telescope: Telescope,
  trophy: Trophy,
};

export function normalizeGradeIcon(value?: string | null): GradeIconKey {
  const normalized = value?.trim().toLowerCase();
  const option = gradeIconOptions.find((item) => item.value === normalized);

  return option?.value ?? "sparkles";
}

export function getGradeIconLabel(value?: string | null) {
  const key = normalizeGradeIcon(value);

  return gradeIconOptions.find((item) => item.value === key)?.label ?? "Étincelle";
}

export default function GradeIcon({
  badge,
  className = "h-4 w-4",
}: {
  badge?: string | null;
  className?: string;
}) {
  const Icon = gradeIcons[normalizeGradeIcon(badge)];

  return <Icon aria-hidden="true" className={className} strokeWidth={2.2} />;
}
