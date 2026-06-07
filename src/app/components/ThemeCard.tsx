import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { publicSiteTexts } from "@/config/site-texts";
import {
  getThemeAccent,
  getThemeFactCount,
  getThemeGradientStops,
  getThemeShortDescription,
  type ThemeDisplayData,
} from "@/lib/themeDisplay";
import ThemeMotif from "./ThemeMotif";
import ThemeIcon from "./ThemeIcon";

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
  const accent = getThemeAccent(theme);
  const gradient = getThemeGradientStops(theme);
  const discovered = Math.max(0, progress?.discovered ?? 0);
  const total = Math.max(progress?.total ?? count, 0);
  const percent =
    total > 0 ? Math.min(Math.round((discovered / total) * 100), 100) : 0;
  const progressLabel = progress
    ? discovered > 0
      ? `${discovered} / ${total} ${publicSiteTexts.themeProgress.readSuffix}`
      : publicSiteTexts.themeProgress.empty
    : count > 0
      ? `${count} ${publicSiteTexts.themeProgress.factsToExplore}`
      : publicSiteTexts.themeProgress.fallback;
  const keywords = (theme.keywords ?? [])
    .filter((keyword): keyword is string => typeof keyword === "string")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .slice(0, 3);

  return (
    <Link
      href={href ?? `/theme/${theme.slug}`}
      className={`group relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0a1728]/88 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.28)] transition duration-500 hover:-translate-y-1 hover:border-white/24 hover:shadow-[0_42px_130px_rgba(0,0,0,0.42)] ${
        compact ? "min-h-[248px]" : "min-h-[292px]"
      }`}
      style={{
        backgroundImage: `radial-gradient(circle at 82% 12%, ${accent}24, transparent 28%), radial-gradient(circle at 18% 96%, ${gradient.middle}20, transparent 34%), linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          backgroundImage: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
        }}
      />
      <ThemeMotif
        motif={theme.visual_motif}
        className="absolute left-6 top-6 h-16 w-16 opacity-35"
        style={{ color: accent } as CSSProperties}
      />
      <span
        className="absolute left-6 top-6 grid h-14 w-14 place-items-center rounded-2xl border border-white/14 bg-black/20 shadow-[0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur"
        style={{ color: accent }}
      >
        <ThemeIcon iconName={theme.theme_icon} className="h-7 w-7" />
      </span>
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
          <p className="mx-auto mt-4 max-w-[34ch] text-center text-sm font-semibold leading-6 text-white/76">
            {getThemeShortDescription(theme)}
          </p>

          {keywords.length > 0 ? (
            <div className="mx-auto mt-5 flex max-w-[280px] flex-wrap justify-center gap-2">
              {keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-white/14 bg-black/18 px-3 py-1.5 text-xs font-black text-white/72 backdrop-blur"
                >
                  {keyword}
                </span>
              ))}
            </div>
          ) : (
            <p className="mx-auto mt-5 max-w-[28ch] text-center text-xs font-black uppercase tracking-[0.16em] text-white/42">
              Un univers à explorer
            </p>
          )}

          <div className="mx-auto mt-5 max-w-[240px]">
            {progress ? (
              <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/14">
                <div
                  className="h-full rounded-full"
                  style={{ backgroundColor: accent, width: `${percent}%` }}
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
