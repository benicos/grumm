import type { LucideIcon } from "lucide-react";
import { premiumTitleGradientClassName } from "./buttonStyles";

export default function PageHero({
  description,
  eyebrow,
  Icon,
  title,
}: {
  description?: string;
  eyebrow: string;
  Icon?: LucideIcon;
  title: string;
}) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center pb-10 pt-8 text-center">
      <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[#f4ead5]/58">
        {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
        {eyebrow}
      </p>
      <h1
        className={`${premiumTitleGradientClassName} mt-4 max-w-2xl text-[clamp(1.95rem,4.6vw,3.1rem)] font-black leading-[1.02] tracking-[-0.045em]`}
      >
        {title}
      </h1>
      {description ? (
        <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/58 sm:text-base">
          {description}
        </p>
      ) : null}
    </section>
  );
}
