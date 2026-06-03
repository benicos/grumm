import { formatAppError } from "@/lib/errors";
import { logSupabaseError } from "@/lib/logger";
import {
  normalizeQuizDifficulty,
  type QuizDifficulty,
} from "@/lib/quizShared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

const GENERAL_QUIZZ_SIZE = 10;

type QuizQuestionRow = {
  id: string;
  difficulty: string | null;
  fact_id: string | null;
  question: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
  facts:
    | {
        id: string;
        slug: string;
        title: string;
        content: string | null;
        status: string;
        categories:
          | { name: string; slug: string }
          | { name: string; slug: string }[]
          | null;
      }
    | null;
};

export type GeneralQuizQuestion = {
  categoryName: string;
  categorySlug: string;
  correctAnswer: string;
  difficulty: QuizDifficulty;
  factContext: string | null;
  factId: string;
  factSlug: string;
  factTitle: string;
  id: string;
  options: string[];
  question: string;
};

export type GeneralQuizAnswer = {
  correctAnswer: string;
  factId: string;
  isCorrect: boolean;
  questionId: string;
  selectedAnswer: string;
};

type QuizSessionInsert = Database["public"]["Tables"]["quiz_sessions"]["Insert"];
type QuizAnswerInsert = Database["public"]["Tables"]["quiz_answers"]["Insert"];

function getCategory(row: NonNullable<QuizQuestionRow["facts"]>) {
  return Array.isArray(row.categories) ? row.categories[0] : row.categories;
}

function cleanText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function uniqueValidAnswers(row: QuizQuestionRow) {
  const answers = [
    row.correct_answer,
    row.wrong_answer_1,
    row.wrong_answer_2,
    row.wrong_answer_3,
  ]
    .map(cleanText)
    .filter((answer): answer is string => Boolean(answer));

  return [...new Set(answers)];
}

function mapQuestion(row: QuizQuestionRow): GeneralQuizQuestion | null {
  const fact = row.facts;

  if (!fact || fact.status !== "published" || !row.fact_id) {
    return null;
  }

  const category = getCategory(fact);
  const question = cleanText(row.question);
  const correctAnswer = cleanText(row.correct_answer);
  const answers = uniqueValidAnswers(row);

  if (!question || !correctAnswer || answers.length !== 4) {
    return null;
  }

  return {
    categoryName: category?.name ?? "Culture",
    categorySlug: category?.slug ?? "culture",
    correctAnswer,
    difficulty: normalizeQuizDifficulty(row.difficulty),
    factContext: cleanText(fact.content),
    factId: fact.id,
    factSlug: fact.slug,
    factTitle: fact.title,
    id: row.id,
    options: shuffle(answers),
    question,
  };
}

export async function createGeneralQuizSession(): Promise<
  | { ok: true; questions: GeneralQuizQuestion[] }
  | { ok: false; message: string; reason?: "not_enough_questions" }
> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return {
      ok: false,
      message: "Le quiz est indisponible pour le moment.",
    };
  }

  const { data, error } = await supabase
    .from("quiz_questions")
    .select(
      "id,fact_id,question,correct_answer,wrong_answer_1,wrong_answer_2,wrong_answer_3,difficulty,facts(id,slug,title,content,status,categories(name,slug))",
    )
    .eq("is_active", true)
    .not("fact_id", "is", null)
    .limit(80);

  if (error) {
    logSupabaseError(error, {
      operation: "read general quizz questions",
      table: "quiz_questions",
    });

    return {
      ok: false,
      message: formatAppError(error, {
        context: {
          operation: "read general quizz questions",
          source: "Supabase",
          table: "quiz_questions",
        },
        prodMessage: "Impossible de préparer le quiz pour le moment.",
      }),
    };
  }

  const byFact = new Map<string, GeneralQuizQuestion>();

  shuffle(((data ?? []) as QuizQuestionRow[]).map(mapQuestion).filter(Boolean))
    .filter((question): question is GeneralQuizQuestion => question !== null)
    .forEach((question) => {
      if (!byFact.has(question.factId)) {
        byFact.set(question.factId, question);
      }
    });

  const questions = [...byFact.values()].slice(0, GENERAL_QUIZZ_SIZE);

  if (questions.length < GENERAL_QUIZZ_SIZE) {
    return {
      ok: false,
      message:
        "Pas assez de questions complètes pour lancer un quiz de 10 questions.",
      reason: "not_enough_questions",
    };
  }

  return { ok: true, questions };
}

export async function persistGeneralQuizResult({
  answers,
  totalQuestions,
}: {
  answers: GeneralQuizAnswer[];
  totalQuestions: number;
}) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false as const };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const };
  }

  const sessionPayload: QuizSessionInsert = {
    completed_at: new Date().toISOString(),
    quiz_type: "general_quizz",
    score: answers.filter((answer) => answer.isCorrect).length,
    total_questions: totalQuestions,
    user_id: user.id,
  };

  const { data: session, error: sessionError } = await supabase
    .from("quiz_sessions")
    .insert(sessionPayload)
    .select("id")
    .single();

  if (sessionError || !session) {
    if (sessionError) {
      logSupabaseError(sessionError, {
        operation: "create general quizz session",
        table: "quiz_sessions",
      });
    }
    return { ok: false as const };
  }

  const answerPayload: QuizAnswerInsert[] = answers.map((answer) => ({
    correct_answer: answer.correctAnswer,
    fact_id: answer.factId,
    is_correct: answer.isCorrect,
    selected_answer: answer.selectedAnswer,
    session_id: session.id,
    user_id: user.id,
  }));

  const { error: answersError } = await supabase
    .from("quiz_answers")
    .insert(answerPayload);

  if (answersError) {
    logSupabaseError(answersError, {
      operation: "save general quizz answers",
      table: "quiz_answers",
    });
    return { ok: false as const };
  }

  return { ok: true as const };
}
