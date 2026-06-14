import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import MemoryChallengePage from "./MemoryChallengePage";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/quiz/memoire",
  description: "Défi mémoire personnalisé réservé aux comptes Grumm.",
  noindex: true,
  title: "Défi mémoire",
});

export default function QuizMemoirePage() {
  return (
    <>
      <h1 className="sr-only">Quiz mémoire et apprentissage</h1>
      <MemoryChallengePage />
    </>
  );
}
