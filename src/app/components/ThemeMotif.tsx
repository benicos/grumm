import { normalizeThemeMotif, type ThemeVisualMotif } from "@/lib/themeDisplay";
import type { CSSProperties } from "react";

type ThemeMotifProps = {
  className?: string;
  motif?: string | null;
  style?: CSSProperties;
};

export default function ThemeMotif({ className = "", motif, style }: ThemeMotifProps) {
  const normalized = normalizeThemeMotif(motif);

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    >
      {renderMotif(normalized)}
    </svg>
  );
}

function renderMotif(motif: ThemeVisualMotif) {
  switch (motif) {
    case "timeline":
      return (
        <>
          <path d="M10 32h44" />
          <path d="M18 24v16M32 20v24M46 26v18" />
          <circle cx="18" cy="32" r="4" />
          <circle cx="32" cy="32" r="4" />
          <circle cx="46" cy="32" r="4" />
        </>
      );
    case "globe":
      return (
        <>
          <circle cx="32" cy="32" r="22" />
          <path d="M10 32h44M32 10c7 7 10 14 10 22s-3 15-10 22M32 10c-7 7-10 14-10 22s3 15 10 22" />
        </>
      );
    case "topography":
      return (
        <>
          <path d="M8 20c10-9 19-9 28 0s16 9 20 3" />
          <path d="M8 32c9-7 17-7 25 0s16 8 23 2" />
          <path d="M8 44c8-5 16-5 24 0s16 5 24 0" />
        </>
      );
    case "soundwave":
      return (
        <>
          <path d="M12 34v-4M20 42V22M28 48V16M36 44V20M44 38V26M52 34v-4" />
        </>
      );
    case "music-note":
      return (
        <>
          <path d="M38 12v31" />
          <path d="M38 12l16 5v8l-16-5" />
          <circle cx="28" cy="45" r="8" />
        </>
      );
    case "projector":
      return (
        <>
          <rect x="12" y="26" width="28" height="18" rx="4" />
          <circle cx="20" cy="18" r="7" />
          <circle cx="34" cy="18" r="7" />
          <path d="M40 33l12-7v18l-12-7" />
        </>
      );
    case "film":
      return (
        <>
          <rect x="12" y="14" width="40" height="36" rx="5" />
          <path d="M22 14v36M42 14v36M12 25h10M42 25h10M12 39h10M42 39h10" />
        </>
      );
    case "molecule":
      return (
        <>
          <circle cx="18" cy="22" r="6" />
          <circle cx="42" cy="18" r="7" />
          <circle cx="46" cy="44" r="6" />
          <circle cx="24" cy="42" r="5" />
          <path d="M23 21l12-2M39 24l5 14M40 44H29M22 27l2 10" />
        </>
      );
    case "orbit":
      return (
        <>
          <circle cx="32" cy="32" r="4" />
          <ellipse cx="32" cy="32" rx="24" ry="10" />
          <ellipse cx="32" cy="32" rx="24" ry="10" transform="rotate(60 32 32)" />
          <ellipse cx="32" cy="32" rx="24" ry="10" transform="rotate(120 32 32)" />
        </>
      );
    case "book":
      return (
        <>
          <path d="M14 15h18v38H14a6 6 0 0 1-6-6V21a6 6 0 0 1 6-6Z" />
          <path d="M32 15h18a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H32" />
        </>
      );
    case "library":
      return (
        <>
          <path d="M10 52h44M14 48V22M26 48V22M38 48V22M50 48V22" />
          <path d="M8 22l24-12 24 12Z" />
        </>
      );
    case "antique-column":
      return (
        <>
          <path d="M16 16h32M20 22h24M22 22v30M32 22v30M42 22v30M16 52h32M12 58h40" />
        </>
      );
    case "laurel":
      return (
        <>
          <path d="M25 52C13 43 12 25 23 14M39 52c12-9 13-27 2-38" />
          <path d="M20 22l-8-2M19 31l-9 1M22 40l-8 5M44 22l8-2M45 31l9 1M42 40l8 5" />
        </>
      );
    case "silhouette":
      return (
        <>
          <circle cx="32" cy="22" r="10" />
          <path d="M16 54c3-11 11-17 16-17s13 6 16 17" />
        </>
      );
    case "portrait":
      return (
        <>
          <rect x="14" y="10" width="36" height="44" rx="8" />
          <circle cx="32" cy="26" r="8" />
          <path d="M22 45c3-7 9-10 10-10s7 3 10 10" />
        </>
      );
    case "brush":
      return (
        <>
          <path d="M42 10L20 36" />
          <path d="M20 36c-5 1-9 5-10 13 8-1 12-5 13-10Z" />
          <path d="M38 14l12 12" />
        </>
      );
    case "frame":
      return (
        <>
          <rect x="10" y="14" width="44" height="36" rx="4" />
          <path d="M18 42l10-12 8 8 6-7 8 11" />
          <circle cx="42" cy="24" r="4" />
        </>
      );
    case "map":
      return (
        <>
          <path d="M12 18l14-6 16 6 12-5v36l-12 5-16-6-14 6Z" />
          <path d="M26 12v36M42 18v36" />
        </>
      );
    case "architecture":
      return (
        <>
          <path d="M12 52h44M16 46h36M20 46V28M32 46V28M44 46V28" />
          <path d="M14 28h38L32 12Z" />
        </>
      );
    case "star":
      return <path d="M32 8l7 17 18 1-14 11 5 18-16-10-16 10 5-18L7 26l18-1Z" />;
    case "constellation":
    default:
      return (
        <>
          <circle cx="14" cy="22" r="3" />
          <circle cx="30" cy="14" r="3" />
          <circle cx="46" cy="26" r="3" />
          <circle cx="36" cy="46" r="3" />
          <path d="M17 21l10-5M33 16l11 8M44 29l-7 15" />
        </>
      );
  }
}
