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
} from "lucide-react-native";

const gradeIcons: Record<string, LucideIcon> = {
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

export function GradeIcon({
  badge,
  color = "#ffd166",
  size = 30,
}: {
  badge?: string | null;
  color?: string;
  size?: number;
}) {
  const key = badge?.trim().toLowerCase() ?? "sparkles";
  const Icon = gradeIcons[key] ?? Sparkles;

  return <Icon color={color} size={size} strokeWidth={2.25} />;
}
