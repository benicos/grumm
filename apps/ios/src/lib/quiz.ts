import { userMessages } from "../config/app";
import { getSupabaseClient, withSupabaseTimeout } from "./supabase";

export type MobileQuizQuestion = {
  correctAnswer: string;
  factId: string;
  id: string;
  options: string[];
  prompt: string;
  theme: string;
};

export type MobileQuizAnswer = {
  correctAnswer: string;
  factId: string;
  isCorrect: boolean;
  questionId: string;
  selectedAnswer: string;
};

export type MobileQuizType = "general_quizz" | "memory_challenge";

export type MobileQuizResult = {
  correctAnswers: number;
  bestStreak: number;
  scorePercent: number;
  totalQuestions: number;
};

type QuizQuestionRow = {
  correct_answer: string | null;
  fact_id: string | null;
  id: string;
  question: string | null;
  wrong_answer_1: string | null;
  wrong_answer_2: string | null;
  wrong_answer_3: string | null;
  facts:
    | {
        categories:
          | {
              name: string;
            }
          | {
              name: string;
            }[]
          | null;
        status: string;
      }
    | null;
};

const QUICK_QUIZ_SIZE = 5;
const MEMORY_QUIZ_SIZE = 10;

function clean(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getCategoryName(row: QuizQuestionRow) {
  const category = Array.isArray(row.facts?.categories)
    ? row.facts?.categories[0]
    : row.facts?.categories;

  return category?.name ?? "Culture";
}

function mapQuestion(row: QuizQuestionRow): MobileQuizQuestion | null {
  const prompt = clean(row.question);
  const correctAnswer = clean(row.correct_answer);
  const answers = [
    row.correct_answer,
    row.wrong_answer_1,
    row.wrong_answer_2,
    row.wrong_answer_3,
  ]
    .map(clean)
    .filter((answer): answer is string => Boolean(answer));
  const options = [...new Set(answers)];

  if (!prompt || !correctAnswer || !row.fact_id || options.length !== 4) {
    return null;
  }

  return {
    correctAnswer,
    factId: row.fact_id,
    id: row.id,
    options: shuffle(options),
    prompt,
    theme: getCategoryName(row),
  };
}

async function readQuizQuestions(limit: number, factIds?: string[]) {
  const supabase = getSupabaseClient();
  let query = supabase
      .from("quiz_questions")
      .select(
        "id,fact_id,question,correct_answer,wrong_answer_1,wrong_answer_2,wrong_answer_3,facts(status,categories(name))",
      )
      .eq("is_active", true)
      .not("fact_id", "is", null)
      .limit(Math.max(limit * 8, 40));

  if (factIds && factIds.length > 0) {
    query = query.in("fact_id", factIds);
  }

  const { data, error } = await withSupabaseTimeout(
    query,
    userMessages.genericLoadError,
    undefined,
    factIds?.length ? "quiz_questions.select.targeted" : "quiz_questions.select.random",
  );

  if (error) {
    throw new Error(userMessages.genericLoadError);
  }

  return shuffle(
    ((data ?? []) as QuizQuestionRow[])
      .filter((row) => row.facts?.status === "published")
      .map(mapQuestion)
      .filter((question): question is MobileQuizQuestion => Boolean(question)),
  );
}

export async function getQuickQuizQuestions() {
  const questions = (await readQuizQuestions(QUICK_QUIZ_SIZE)).slice(0, QUICK_QUIZ_SIZE);

  if (questions.length < QUICK_QUIZ_SIZE) {
    throw new Error("Pas assez de questions pour lancer le quiz.");
  }

  return questions;
}

export async function getMemoryChallengeQuestions() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await withSupabaseTimeout(
    supabase.auth.getUser(),
    userMessages.genericLoadError,
    undefined,
    "auth.getUser",
  );
  let viewedFactIds: string[] = [];

  if (user) {
    const { data } = await withSupabaseTimeout(
      supabase
        .from("user_fact_views")
        .select("fact_id")
        .eq("user_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(80),
      userMessages.genericLoadError,
      undefined,
      "user_fact_views.select.quiz",
    );
    viewedFactIds = [...new Set((data ?? []).map((row) => row.fact_id).filter(Boolean))];
  }

  const targeted = viewedFactIds.length > 0
    ? (await readQuizQuestions(MEMORY_QUIZ_SIZE, viewedFactIds)).slice(0, MEMORY_QUIZ_SIZE)
    : [];
  const fallback = targeted.length < MEMORY_QUIZ_SIZE
    ? (await readQuizQuestions(MEMORY_QUIZ_SIZE)).filter((question) => !targeted.some((item) => item.id === question.id))
    : [];
  const questions = [...targeted, ...fallback].slice(0, MEMORY_QUIZ_SIZE);

  if (questions.length < QUICK_QUIZ_SIZE) {
    throw new Error("Pas assez de questions pour lancer le défi.");
  }

  return questions;
}

export async function getMistakeReviewQuestions() {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await withSupabaseTimeout(
    supabase.auth.getUser(),
    userMessages.genericLoadError,
    undefined,
    "auth.getUser",
  );

  if (!user) {
    return [];
  }

  const { data } = await withSupabaseTimeout(
    supabase
      .from("quiz_answers")
      .select("fact_id")
      .eq("user_id", user.id)
      .eq("is_correct", false)
      .order("created_at", { ascending: false })
      .limit(50),
    userMessages.genericLoadError,
    undefined,
    "quiz_answers.select.mistakes",
  );
  const factIds = [...new Set((data ?? []).map((row) => row.fact_id).filter(Boolean))];

  if (factIds.length === 0) {
    return [];
  }

  return (await readQuizQuestions(QUICK_QUIZ_SIZE, factIds)).slice(0, QUICK_QUIZ_SIZE);
}

function getBestStreak(answers: MobileQuizAnswer[]) {
  let current = 0;
  let best = 0;

  answers.forEach((answer) => {
    current = answer.isCorrect ? current + 1 : 0;
    best = Math.max(best, current);
  });

  return best;
}

export function getQuizResult(answers: MobileQuizAnswer[]): MobileQuizResult {
  const correctAnswers = answers.filter((answer) => answer.isCorrect).length;
  const totalQuestions = answers.length;

  return {
    bestStreak: getBestStreak(answers),
    correctAnswers,
    scorePercent: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
    totalQuestions,
  };
}

export async function saveQuizResult(answers: MobileQuizAnswer[], quizType: MobileQuizType) {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await withSupabaseTimeout(
    supabase.auth.getUser(),
    userMessages.genericLoadError,
    undefined,
    "auth.getUser",
  );

  if (!user) {
    return null;
  }
  const result = getQuizResult(answers);

  const { data: session, error: sessionError } = await withSupabaseTimeout(
    supabase
      .from("quiz_sessions")
      .insert({
        completed_at: new Date().toISOString(),
        quiz_type: quizType,
        score: result.correctAnswers,
        total_questions: result.totalQuestions,
        user_id: user.id,
      })
      .select("id")
      .single(),
    userMessages.genericLoadError,
    undefined,
    "quiz_sessions.insert",
  );

  if (sessionError || !session) {
    return result;
  }

  await withSupabaseTimeout(
    supabase.from("quiz_answers").insert(
      answers.map((answer) => ({
        correct_answer: answer.correctAnswer,
        fact_id: answer.factId,
        is_correct: answer.isCorrect,
        selected_answer: answer.selectedAnswer,
        session_id: session.id,
        user_id: user.id,
      })),
    ),
    userMessages.genericLoadError,
    undefined,
    "quiz_answers.insert",
  );

  return result;
}

export async function saveQuickQuizResult(answers: MobileQuizAnswer[]) {
  return saveQuizResult(answers, "general_quizz");
}
