"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFactOfTheDay } from "@/lib/facts";
import type { FeedFact } from "@/lib/facts";
import { premiumPrimaryCtaClassName } from "./buttonStyles";
import ThemeMotif from "./ThemeMotif";

function FactOfDaySkeleton() {
  return (
    <section className="py-16">
      <div className="mx-auto max-w-[1180px] px-5">
        <div className="rounded-lg border border-white/10 bg-white/[0.055] p-6 backdrop-blur-xl">
          <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="mt-6 h-10 w-3/4 animate-pulse rounded-full bg-white/10" />
          <div className="mt-5 h-4 w-full max-w-xl animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    </section>
  );
}

function getReadableBadgeColors(color: string) {
  const normalized = color.trim();
  const hex = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];

  if (!hex) {
    return {
      backgroundColor: "rgba(244, 234, 213, 0.94)",
      borderColor: "rgba(255,255,255,0.42)",
      color: "#07111f",
    };
  }

  const fullHex =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;
  const [r, g, b] = [0, 2, 4].map((start) =>
    Number.parseInt(fullHex.slice(start, start + 2), 16),
  );
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.62
    ? {
        backgroundColor: "rgba(7, 17, 31, 0.78)",
        borderColor: "rgba(255,255,255,0.18)",
        color: "#ffffff",
      }
    : {
        backgroundColor: normalized,
        borderColor: "rgba(255,255,255,0.28)",
        color: "#07111f",
      };
}

export default function FactOfDay() {
  const [fact, setFact] = useState<FeedFact | null>(null);
  const [interactionCount, setInteractionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadFact() {
      try {
        const result = await getFactOfTheDay();

        if (isMounted) {
          setFact(result.fact);
          setInteractionCount(result.interactionCount);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadFact();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <FactOfDaySkeleton />;
  }

  if (!fact) {
    return null;
  }

  const accentColor = fact.accent || "#ffd166";
  const badgeColors = getReadableBadgeColors(accentColor);

  return (
    <section className="py-16">
      <div className="mx-auto max-w-[1180px] px-5">
        <article
          className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0a1728]/88 p-6 shadow-2xl backdrop-blur-xl md:p-8"
          style={{
            backgroundImage: `radial-gradient(circle at 82% 10%, ${accentColor}22, transparent 30%), linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.022))`,
          }}
        >
          <ThemeMotif
            motif={fact.visualMotif}
            className="absolute right-6 top-6 h-24 w-24 opacity-35 md:h-32 md:w-32"
            style={{ color: accentColor }}
          />
          <div
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            }}
          />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] shadow-[0_14px_34px_rgba(0,0,0,0.22)]"
                  style={badgeColors}
                >
                  Fait du jour
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white/62">
                  {fact.category}
                </span>
                {interactionCount > 0 && (
                  <span className="text-xs font-bold text-white/45">
                    {interactionCount}&nbsp;interaction(s) aujourd&apos;hui
                  </span>
                )}
              </div>

              <h2 className="mt-5 max-w-3xl text-[clamp(1.7rem,4vw,3rem)] font-extrabold leading-tight tracking-[-0.05em]">
                {fact.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/68">
                {fact.detail}
              </p>
            </div>

            <Link
              href={`/fait/${fact.slug}`}
              className={premiumPrimaryCtaClassName}
            >
              Lire le fait
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
