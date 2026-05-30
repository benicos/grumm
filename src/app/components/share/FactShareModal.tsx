"use client";

import { toPng } from "html-to-image";
import { Download, Link as LinkIcon, Share2, X } from "lucide-react";
import { type CSSProperties, useMemo, useRef, useState } from "react";
import { siteConfig, socialShareConfig } from "@/config/app";
import { cleanFactSource, type FeedFact } from "@/lib/facts";
import FactSource from "../FactSource";
import { premiumPrimaryCtaClassName } from "../buttonStyles";

type FactShareModalProps = {
  fact: FeedFact | null;
  onClose: () => void;
};

function truncateText(value: string | null | undefined, maxLength: number) {
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function clampStyle(lines: number): CSSProperties {
  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lines,
  };
}

function dataUrlToBlob(dataUrl: string) {
  return fetch(dataUrl).then((response) => response.blob());
}

export default function FactShareModal({ fact, onClose }: FactShareModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const factUrl = useMemo(() => {
    if (!fact) {
      return siteConfig.publicUrl;
    }

    if (typeof window !== "undefined") {
      return `${window.location.origin}/fact/${fact.slug}`;
    }

    return `${siteConfig.publicUrl}/fact/${fact.slug}`;
  }, [fact]);

  if (!fact) {
    return null;
  }

  const activeFact = fact;
  const fileName = `grumm-${activeFact.slug}-story.png`;
  const title = truncateText(activeFact.title, 76);
  const detail = truncateText(activeFact.detail, 170);
  const source = truncateText(activeFact.source, 68);
  const shareText = activeFact.hook?.trim() || activeFact.title;
  const displayUrl = siteConfig.publicUrl.replace(/^https?:\/\//, "");

  async function renderStoryBlob() {
    const node = cardRef.current;

    if (!node) {
      throw new Error("Aperçu indisponible.");
    }

    const dataUrl = await toPng(node, {
      cacheBust: true,
      height: socialShareConfig.story.previewHeight,
      pixelRatio: socialShareConfig.story.pixelRatio,
      style: {
        height: `${socialShareConfig.story.previewHeight}px`,
        maxWidth: "none",
        width: `${socialShareConfig.story.previewWidth}px`,
      },
      width: socialShareConfig.story.previewWidth,
    });

    return dataUrlToBlob(dataUrl);
  }

  async function downloadStory() {
    setIsRendering(true);
    setStatus(null);

    try {
      const blob = await renderStoryBlob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setStatus("Image téléchargée.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "L’image n’a pas pu être générée.",
      );
    } finally {
      setIsRendering(false);
    }
  }

  async function copyLink(message = "Lien copié.") {
    if (!navigator.clipboard) {
      setStatus("Copie indisponible sur ce navigateur.");
      return false;
    }

    await navigator.clipboard.writeText(factUrl);
    setStatus(message);
    return true;
  }

  async function shareImage() {
    setIsRendering(true);
    setStatus(null);

    try {
      const blob = await renderStoryBlob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (!navigator.canShare?.({ files: [file] })) {
        setStatus(socialShareConfig.fallbackMessage);
        return;
      }

      await navigator.share({
        files: [file],
        text: `${shareText}\n\n${factUrl}`,
        title: activeFact.title,
      });
      setStatus("Image prête à être partagée.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus(null);
      } else {
        setStatus(socialShareConfig.fallbackMessage);
      }
    } finally {
      setIsRendering(false);
    }
  }

  async function shareLink() {
    setStatus(null);

    try {
      if (navigator.share) {
        await navigator.share({
          text: `${shareText}\n\n${factUrl}`,
          title: activeFact.title,
          url: factUrl,
        });
        setStatus("Lien prêt à être partagé.");
        return;
      }

      await copyLink("Partage natif indisponible. Lien copié.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus(null);
      } else {
        await copyLink("Partage natif indisponible. Lien copié.");
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-black/72 px-4 py-6 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-label="Partager ce fait"
    >
      <div className="relative grid w-full max-w-5xl gap-5 rounded-[24px] border border-white/10 bg-[#07111f]/95 p-4 text-white shadow-[0_30px_120px_rgba(0,0,0,0.55)] sm:p-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-white/72 transition hover:text-white"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto w-full max-w-[360px] overflow-hidden">
          <div
            ref={cardRef}
            className="relative isolate h-[640px] w-[360px] max-w-full overflow-hidden bg-[#07111f] text-white shadow-2xl"
            style={{ borderRadius: 0 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_13%,rgba(255,209,102,0.22),transparent_28%),radial-gradient(circle_at_78%_22%,rgba(106,227,192,0.16),transparent_30%),linear-gradient(145deg,#07111f_0%,#132338_48%,#08101d_100%)]" />
            <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:34px_34px]" />
            <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/70 to-transparent" />

            <div className="relative flex h-full min-h-0 flex-col px-6 py-4">

              <div className="mt-4">
                <span className="inline-flex max-w-full overflow-hidden rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd166]">
                  <span className="truncate">{activeFact.category}</span>
                </span>
              </div>

              <div className="flex min-h-0 flex-1 items-center py-6">
                <div className="min-w-0">
                  <h2
                    className="max-h-[190px] overflow-hidden text-[34px] font-black leading-[1.03] tracking-[-0.04em]"
                    style={clampStyle(5)}
                  >
                    {title}
                  </h2>
                  <p
                    className="mt-5 max-h-[138px] overflow-hidden text-[16px] font-semibold leading-[1.42] text-white/78"
                    style={clampStyle(6)}
                  >
                    {detail}
                  </p>
                </div>
              </div>

              <div className="shrink-0 space-y-4">
                {source ? (
                  <div className="rounded-[18px] border border-white/10 bg-white/[0.08] p-4 backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
                      Source
                    </p>
                    <p
                      className="mt-1 max-h-[34px] overflow-hidden text-[13px] font-bold leading-snug text-white/72"
                      style={clampStyle(2)}
                    >
                      {source}
                    </p>
                  </div>
                ) : null}

                <div className="flex items-end justify-between gap-5">
                  <div className="flex items-center gap-2 text-white/62">
                    <span className="grid h-7 w-7 place-items-center rounded-[10px] bg-gradient-to-br from-[#ffd166] to-[#6ae3c0] text-xs font-black text-[#06111d]">
                      V
                    </span>
                    <span className="text-[12px] font-black tracking-[-0.03em]">
                      Grumm.
                    </span>
                  </div>
                  <p className="max-w-[150px] text-right text-[11px] font-bold text-white/40">
                    {displayUrl}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="flex min-w-0 flex-col justify-center pr-0 pt-8 lg:pr-8 lg:pt-0">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
            Partage
          </p>
          <h2 className="mt-4 max-w-xl text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">
            Génère une carte verticale prête à être partagée !
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/58">
            Tu as appris quelque chose ? Fais le savoir à tes amis en partageant ce fait de manière simple et rapide.
          </p>
          {cleanFactSource(activeFact.source) ? (
            <div className="mt-5 max-w-xl rounded-md border border-white/10 bg-white/[0.045] px-4 py-3">
              <FactSource
                className="text-sm text-white/58"
                source={activeFact.source}
                sourceUrl={activeFact.sourceUrl}
              />
            </div>
          ) : null}

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={downloadStory}
              disabled={isRendering}
              className={`${premiumPrimaryCtaClassName} gap-2`}
            >
              <Download className="h-4 w-4" />
              Télécharger l’image
            </button>
            <button
              type="button"
              onClick={shareImage}
              disabled={isRendering}
              className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.06] px-[18px] py-3 text-sm font-bold text-white transition hover:-translate-y-[2px] hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Share2 className="h-4 w-4" />
              Partager l’image
            </button>
            <button
              type="button"
              onClick={shareLink}
              className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-white/10 px-[18px] py-3 text-sm font-bold text-white/72 transition hover:-translate-y-[2px] hover:border-white/20 hover:text-white sm:col-span-2"
            >
              <LinkIcon className="h-4 w-4" />
              Partager le lien
            </button>
          </div>

          {status && (
            <p className="mt-5 rounded-md border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold leading-6 text-white/68">
              {status}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
