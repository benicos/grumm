import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/quiz/memoire",
  description: "Défi mémoire personnalisé réservé aux comptes Grumm.",
  noindex: true,
  title: "Défi mémoire",
});

export { default } from "./MemoryChallengePage";
