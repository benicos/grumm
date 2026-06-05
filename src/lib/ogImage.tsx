import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/app";

type GrummOgImageInput = {
  accent?: string;
  description: string;
  eyebrow?: string;
  subtitle: string;
  title: string;
};

export const grummOgImageSize = {
  height: 630,
  width: 1200,
};

export const grummOgImageContentType = "image/png";

export function createGrummOgImage({
  accent = "#ffd166",
  description,
  eyebrow = "Grumm.",
  subtitle,
  title,
}: GrummOgImageInput) {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background:
            "radial-gradient(circle at 18% 18%, rgba(255,209,102,0.28), transparent 28%), radial-gradient(circle at 78% 20%, rgba(106,227,192,0.18), transparent 30%), linear-gradient(135deg, #05070b 0%, #111827 48%, #05070b 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: "999px",
              color: "rgba(255,255,255,0.78)",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              padding: "14px 24px",
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              background: accent,
              borderRadius: 999,
              boxShadow: `0 0 80px ${accent}`,
              height: 22,
              width: 110,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              color: accent,
              fontSize: 34,
              fontWeight: 850,
              letterSpacing: "-0.04em",
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              fontSize: 102,
              fontWeight: 900,
              letterSpacing: "-0.075em",
              lineHeight: 0.9,
              maxWidth: 960,
            }}
          >
            {title}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.72)",
              fontSize: 32,
              fontWeight: 650,
              lineHeight: 1.28,
              maxWidth: 880,
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            alignItems: "center",
            color: "rgba(255,255,255,0.58)",
            display: "flex",
            fontSize: 26,
            fontWeight: 800,
            justifyContent: "space-between",
          }}
        >
          <span>{siteConfig.publicUrl.replace("https://", "")}</span>
          <span>La culture qui se scrolle.</span>
        </div>
      </div>
    ),
    grummOgImageSize,
  );
}
