import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import QuizzExperience from "./QuizzExperience";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/quizz",
  description:
    "Teste ta culture avec un quiz Grumm rapide, vivant et pensé pour apprendre à chaque réponse.",
  title: "Grumm Quizz",
});

export default function QuizzPage() {
  return <QuizzExperience />;
}
