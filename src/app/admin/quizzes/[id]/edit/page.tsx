import QuizEditor from "../../QuizEditor";

export default async function EditQuizQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <QuizEditor questionId={id} />;
}
