import type { Metadata } from "next";
import { buildDefaultMetadata } from "@/lib/serverMetadata";
import QuizExperience from "./QuizExperience";

export const metadata: Metadata = buildDefaultMetadata({
  canonicalPath: "/quiz/general",
  imagePath: "/quiz/general/opengraph-image",
  description:
    "Teste ta culture avec un quiz Grumm rapide, vivant et pensé pour apprendre à chaque réponse.",
  title: "Grumm Quiz général",
});

export default function QuizGeneralPage() {
  return (
    <>
      <h1 className="sr-only">Quiz de culture générale</h1>
      <QuizExperience />
    </>
  );
}
