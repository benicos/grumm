import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/explorer",
  description:
    "Recherche un sujet précis, un thème ou un fait culturel sur Grumm.",
  title: "Explorer",
});

export default function ExplorerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
