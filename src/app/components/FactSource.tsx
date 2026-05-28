import { ExternalLink } from "lucide-react";

type FactSourceProps = {
  accent?: string;
  className?: string;
  label?: string;
  onSourceClick?: () => void;
  source?: string | null;
  sourceUrl?: string | null;
};

export default function FactSource({
  accent,
  className = "text-sm text-white/70",
  label = "Source:",
  onSourceClick,
  source,
  sourceUrl,
}: FactSourceProps) {
  const cleanSource = source?.trim();
  const cleanUrl = sourceUrl?.trim();

  if (!cleanSource) {
    return null;
  }

  const text = label ? `${label} ${cleanSource}` : cleanSource;

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {accent ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
        />
      ) : null}
      {cleanUrl ? (
        <a
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onSourceClick}
          className="inline-flex min-w-0 items-center gap-1.5 font-bold text-current opacity-90 transition hover:opacity-100"
        >
          <span className="truncate underline decoration-white/0 underline-offset-4 transition hover:decoration-white/45">
            {text}
          </span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-55" aria-hidden="true" />
        </a>
      ) : (
        <span className="min-w-0 truncate">
          {text}
        </span>
      )}
    </span>
  );
}
