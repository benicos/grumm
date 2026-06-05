import { createElement } from "react";
import type { LucideProps } from "lucide-react";
import { getThemeIconComponent } from "@/lib/icons";

type ThemeIconProps = Omit<LucideProps, "name"> & {
  iconName?: string | null;
};

export default function ThemeIcon({ iconName, ...props }: ThemeIconProps) {
  const Icon = getThemeIconComponent(iconName);

  return createElement(Icon, { "aria-hidden": true, ...props });
}
