import { ImageResponse } from "next/og";
import { getFactMetadataBySlug } from "@/lib/serverMetadata";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ factSlug: string }>;
}) {
  const { factSlug } = await params;
  const fact = await getFactMetadataBySlug(factSlug);

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background:
            "radial-gradient(circle at 18% 18%, rgba(255,209,102,0.34), transparent 28%), radial-gradient(circle at 86% 22%, rgba(106,227,192,0.26), transparent 30%), linear-gradient(135deg, #050b13 0%, #0b1727 52%, #13243a 100%)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter, Arial, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: "70px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: "18px",
            }}
          >
            <div
              style={{
                alignItems: "center",
                background: "linear-gradient(135deg, #ffd166, #6ae3c0)",
                borderRadius: "24px",
                color: "#06111d",
                display: "flex",
                fontSize: 34,
                fontWeight: 900,
                height: 72,
                justifyContent: "center",
                width: 72,
              }}
            >
              V
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1 }}>
              Velora
            </div>
          </div>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 999,
              color: "rgba(255,255,255,0.78)",
              fontSize: 24,
              fontWeight: 800,
              padding: "14px 24px",
              textTransform: "uppercase",
            }}
          >
            {fact.themeName ?? "Découvrir"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              color: "#ffd166",
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 5,
              textTransform: "uppercase",
            }}
          >
            Fait à partager
          </div>
          <div
            style={{
              fontSize: 78,
              fontWeight: 900,
              letterSpacing: -4,
              lineHeight: 0.98,
              maxWidth: 980,
            }}
          >
            {fact.title}
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.66)",
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 860,
            }}
          >
            {fact.description}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
