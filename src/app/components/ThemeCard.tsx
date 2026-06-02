import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  getThemeFactCount,
  getThemeGradientStyle,
  getThemeShortDescription,
  type ThemeDisplayData,
} from "@/lib/themeDisplay";
import ThemeMotif from "./ThemeMotif";

type ThemeProgress = {
  discovered: number;
  total: number;
};

type ThemeCardProps = {
  compact?: boolean;
  href?: string;
  progress?: ThemeProgress | null;
  theme: ThemeDisplayData & { id?: string };
};

export default function ThemeCard({
  compact = false,
  href,
  progress,
  theme,
}: ThemeCardProps) {
  const count = getThemeFactCount(theme);
  const discovered = Math.max(0, progress?.discovered ?? 0);
  const total = Math.max(progress?.total ?? count, 0);
  const percent = total > 0 ? Math.min(Math.round((discovered / total) * 100), 100) : 0;
  const progressLabel = progress
    ? discovered > 0
      ? `${discovered} / ${total} découverts`
      : "Commencer ce thème"
    : count > 0
      ? `${count} faits à explorer`
      : "Un thème à découvrir";

  return (
    <Link
      href={href ?? `/theme/${theme.slug}`}
      className={`group relative overflow-hidden rounded-[32px] border border-white/10 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.28)] transition duration-500 hover:-translate-y-1 hover:border-white/24 hover:shadow-[0_42px_130px_rgba(0,0,0,0.42)] ${
        compact ? "min-h-[248px]" : "min-h-[292px]"
      }`}
      style={getThemeGradientStyle(theme)}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.20),transparent_25%),radial-gradient(circle_at_18%_88%,rgba(244,234,213,0.12),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.68))]" />
      <ThemeMotif
        motif={theme.visual_motif}
        className="absolute left-6 top-6 h-16 w-16 text-white/28"
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-end gap-4">
          <span className="rounded-full border border-white/12 bg-black/22 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-white/72 backdrop-blur-xl">
            {progressLabel}
          </span>
        </div>

        <div className={compact ? "mt-auto pt-12" : "mt-auto pt-18"}>
          <h3 className="text-center text-[clamp(1.7rem,3.8vw,2.75rem)] font-extrabold leading-[1.02] tracking-[-0.028em] text-white [text-wrap:balance]">
            {theme.name}
          </h3>
          <p className="mx-auto mt-4 line-clamp-3 max-w-[34ch] text-center text-sm font-semibold leading-6 text-white/76">
            {getThemeShortDescription(theme)}
          </p>

          <div className="mx-auto mt-6 max-w-[240px]">
            {progress ? (
              <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/14">
                <div
                  className="h-full rounded-full bg-white/70"
                  style={{ width: `${percent}%` }}
                />
              </div>
            ) : null}
            <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/[0.06] px-4 py-2 text-sm font-black text-white transition group-hover:translate-x-1 group-hover:border-white/30">
              Explorer
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
