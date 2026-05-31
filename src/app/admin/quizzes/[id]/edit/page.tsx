"use client";

import { useParams } from "next/navigation";
import QuizEditor from "../../QuizEditor";

export default function EditQuizQuestionPage() {
  const params = useParams<{ id: string }>();

  return <QuizEditor questionId={params.id} />;
}
