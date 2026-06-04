import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import QuizExperience from "./QuizExperience";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/quiz/general",
  description:
    "Teste ta culture avec un quiz Grumm rapide, vivant et pensé pour apprendre à chaque réponse.",
  title: "Grumm Quiz général",
});

export default function QuizGeneralPage() {
  return <QuizExperience />;
}
