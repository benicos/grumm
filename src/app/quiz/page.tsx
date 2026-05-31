import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import MemoryChallengePage from "../profile/memory-challenge/page";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/quiz",
  description:
    "Révise les faits lus sur Grumm avec un quiz mémoire court et progressif.",
  title: "Quiz mémoire",
});

export default MemoryChallengePage;
