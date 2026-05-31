import { isCommercialCollaborationSlug } from "@/lib/commercial";
import { quizCopy } from "@/config/quizCopy";
import { formatAppError, getConfiguredErrorMessage } from "@/lib/errors";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

const MIN_MEMORY_FACTS = 3;
const MAX_MEMORY_QUESTIONS = 5;
const MEMORY_FACT_LIMIT = 60;

type ReadFactRow = {
  fact_id: string;
  facts:
    | {
        id: string;
        slug: string;
        title: string;
        hook: string | null;
        content: string;
        categories:
          | {
              name: string;
              slug: string;
            }
          | {
              name: string;
              slug: string;
            }[]
          | null;
      }
    | null;
};

type QuizQuestionRow = {
  correct_answer: string;
  fact_id: string | null;
  question: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
};

export type MemoryChallengeFact = {
  category: string;
  categorySlug: string;
  id: string;
  promptAnswer: string;
  slug: string;
  title: string;
};

export type MemoryChallengeQuestion = {
  correctAnswer: string;
  factTitle: string;
  factId: string;
  factSlug: string;
  isCustom: boolean;
  options: string[];
  prompt: string;
  title: string;
};

export type MemoryChallengeSession = {
  id: string;
  questions: MemoryChallengeQuestion[];
};

export type MemoryStats = {
  averageScorePercent: number | null;
  bestStreakDays: number;
  challengesCompleted: number;
  currentStreakDays: number;
  lastScore: number | null;
  lastTotal: number | null;
  revisableFacts: number;
};

type QuizSessionInsert = Database["public"]["Tables"]["quiz_sessions"]["Insert"];
type QuizAnswerInsert = Database["public"]["Tables"]["quiz_answers"]["Insert"];

function getCategory(row: NonNullable<ReadFactRow["facts"]>) {
  return Array.isArray(row.categories) ? row.categories[0] : row.categories;
}

function cleanAnswer(value: string | null | undefined) {
  const text = value?.replace(/\s+/g, " ").trim();

  if (!text) {
    return null;
  }

  return text.length > 160 ? `${text.slice(0, 157).trim()}...` : text;
}

function mapReadFact(row: ReadFactRow): MemoryChallengeFact | null {
  const fact = row.facts;

  if (!fact) {
    return null;
  }

  const category = getCategory(fact);

  if (!category || isCommercialCollaborationSlug(category.slug)) {
    return null;
  }

  const promptAnswer = cleanAnswer(fact.hook) ?? cleanAnswer(fact.content);

  if (!promptAnswer) {
    return null;
  }

  return {
    category: category.name,
    categorySlug: category.slug,
    id: fact.id,
    promptAnswer,
    slug: fact.slug,
    title: fact.title,
  };
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function getQuestionPrompt(): string {
  return quizCopy.generatedQuestionPrompt;
}

function buildCuratedQuestions(
  facts: MemoryChallengeFact[],
  quizRows: QuizQuestionRow[],
) {
  const factById = new Map(facts.map((fact) => [fact.id, fact]));

  return shuffle(quizRows)
    .map((row) => {
      if (!row.fact_id) {
        return null;
      }

      const fact = factById.get(row.fact_id);

      if (!fact) {
        return null;
      }

      const question: MemoryChallengeQuestion = {
        correctAnswer: row.correct_answer,
        factTitle: fact.title,
        factId: fact.id,
        factSlug: fact.slug,
        isCustom: true,
        options: shuffle([
          row.correct_answer,
          row.wrong_answer_1,
          row.wrong_answer_2,
          row.wrong_answer_3,
        ]),
        prompt: quizCopy.customQuestionPrompt,
        title: row.question,
      };

      return question;
    })
    .filter((question): question is MemoryChallengeQuestion => question !== null);
}

function buildQuestions(
  facts: MemoryChallengeFact[],
  quizRows: QuizQuestionRow[] = [],
) {
  const questionCount = Math.min(MAX_MEMORY_QUESTIONS, facts.length);
  const curatedQuestions = buildCuratedQuestions(facts, quizRows);
  const curatedFactIds = new Set(
    curatedQuestions.map((question) => question.factId),
  );
  const selectedFacts = shuffle(
    facts.filter((fact) => !curatedFactIds.has(fact.id)),
  ).slice(0, Math.max(0, questionCount - curatedQuestions.length));

  const generatedQuestions = selectedFacts
    .map((fact) => {
      const wrongAnswers = shuffle(
        facts
          .filter((candidate) => candidate.id !== fact.id)
          .map((candidate) => candidate.promptAnswer),
      )
        .filter((answer, index, answers) => answers.indexOf(answer) === index)
        .slice(0, 3);

      if (wrongAnswers.length < 2) {
        return null;
      }

      const question: MemoryChallengeQuestion = {
        correctAnswer: fact.promptAnswer,
        factTitle: fact.title,
        factId: fact.id,
        factSlug: fact.slug,
        isCustom: false,
        options: shuffle([fact.promptAnswer, ...wrongAnswers]),
        prompt: getQuestionPrompt(),
        title: fact.title,
      };

      return question;
    })
    .filter((question): question is MemoryChallengeQuestion => question !== null);

  return shuffle([...curatedQuestions, ...generatedQuestions]).slice(
    0,
    MAX_MEMORY_QUESTIONS,
  );
}

async function getAuthenticatedMemoryClient() {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return { ok: false as const, message: getConfiguredErrorMessage() };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false as const,
      message: "Connecte-toi pour lancer un défi mémoire.",
    };
  }

  return { ok: true as const, supabase, user };
}

function getLocalDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getMemoryStreaks(completedAtValues: string[]) {
  const completedDays = new Set(
    completedAtValues
      .filter(Boolean)
      .map(getLocalDateKey),
  );
  const sortedDays = [...completedDays].sort();
  let bestStreakDays = 0;
  let runningStreak = 0;
  let previousTime: number | null = null;

  sortedDays.forEach((day) => {
    const currentTime = new Date(`${day}T00:00:00`).getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    runningStreak =
      previousTime !== null && currentTime - previousTime === oneDay
        ? runningStreak + 1
        : 1;
    bestStreakDays = Math.max(bestStreakDays, runningStreak);
    previousTime = currentTime;
  });

  const today = getLocalDateKey(new Date().toISOString());
  const yesterday = getLocalDateKey(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  );
  let currentStreakDays = 0;

  if (completedDays.has(today) || completedDays.has(yesterday)) {
    const cursor = new Date(
      `${completedDays.has(today) ? today : yesterday}T00:00:00`,
    );

    while (completedDays.has(getLocalDateKey(cursor.toISOString()))) {
      currentStreakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  return { bestStreakDays, currentStreakDays };
}

function memoryError(error: unknown, operation: string, table?: string) {
  return formatAppError(error, {
    context: {
      operation,
      source: "Supabase",
      table,
    },
    prodMessage: "Le défi mémoire est indisponible pour le moment.",
  });
}

export async function getMemoryChallengeStats(): Promise<MemoryStats> {
  const auth = await getAuthenticatedMemoryClient();

  if (!auth.ok) {
    return {
      averageScorePercent: null,
      bestStreakDays: 0,
      challengesCompleted: 0,
      currentStreakDays: 0,
      lastScore: null,
      lastTotal: null,
      revisableFacts: 0,
    };
  }

  const [viewRowsResult, sessionsResult] = await Promise.all([
    auth.supabase
      .from("user_fact_views")
      .select("fact_id,facts(id,slug,title,hook,content,categories(name,slug))")
      .eq("user_id", auth.user.id)
      .limit(MEMORY_FACT_LIMIT),
    auth.supabase
      .from("quiz_sessions")
      .select("score,total_questions,completed_at")
      .eq("user_id", auth.user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(20),
  ]);

  if (viewRowsResult.error) {
    throw new Error(
      memoryError(viewRowsResult.error, "read memory challenge facts", "user_fact_views"),
    );
  }

  if (sessionsResult.error) {
    throw new Error(
      memoryError(sessionsResult.error, "read memory challenge sessions", "quiz_sessions"),
    );
  }

  const revisableFacts = ((viewRowsResult.data ?? []) as ReadFactRow[])
    .map(mapReadFact)
    .filter(Boolean).length;
  const sessions = sessionsResult.data ?? [];
  const completed = sessions.filter((session) => session.total_questions > 0);
  const last = completed[0];
  const streaks = getMemoryStreaks(
    completed
      .map((session) => session.completed_at)
      .filter((value): value is string => Boolean(value)),
  );
  const averageScorePercent =
    completed.length > 0
      ? Math.round(
          completed.reduce(
            (sum, session) =>
              sum + (session.score / Math.max(session.total_questions, 1)) * 100,
            0,
          ) / completed.length,
        )
      : null;

  return {
    averageScorePercent,
    bestStreakDays: streaks.bestStreakDays,
    challengesCompleted: completed.length,
    currentStreakDays: streaks.currentStreakDays,
    lastScore: last?.score ?? null,
    lastTotal: last?.total_questions ?? null,
    revisableFacts,
  };
}

export async function createMemoryChallengeSession(): Promise<
  | { ok: true; session: MemoryChallengeSession }
  | { ok: false; message: string; reason?: "not_enough_facts" }
> {
  const auth = await getAuthenticatedMemoryClient();

  if (!auth.ok) {
    return { ok: false, message: auth.message };
  }

  const { data, error } = await auth.supabase
    .from("user_fact_views")
    .select("fact_id,facts(id,slug,title,hook,content,categories(name,slug))")
    .eq("user_id", auth.user.id)
    .order("first_viewed_at", { ascending: false })
    .limit(MEMORY_FACT_LIMIT);

  if (error) {
    return {
      ok: false,
      message: memoryError(error, "read memory challenge facts", "user_fact_views"),
    };
  }

  const facts = ((data ?? []) as ReadFactRow[])
    .map(mapReadFact)
    .filter((fact): fact is MemoryChallengeFact => fact !== null);
  const factIds = facts.map((fact) => fact.id);
  const quizResult =
    factIds.length > 0
      ? await auth.supabase
          .from("quiz_questions")
          .select(
            "fact_id,question,correct_answer,wrong_answer_1,wrong_answer_2,wrong_answer_3",
          )
          .eq("is_active", true)
          .in("fact_id", factIds)
          .limit(30)
      : { data: [] as QuizQuestionRow[], error: null };

  if (quizResult.error) {
    return {
      ok: false,
      message: memoryError(
        quizResult.error,
        "read memory challenge curated questions",
        "quiz_questions",
      ),
    };
  }

  const questions = buildQuestions(
    facts,
    (quizResult.data ?? []) as QuizQuestionRow[],
  );

  if (facts.length < MIN_MEMORY_FACTS || questions.length < MIN_MEMORY_FACTS) {
    return {
      ok: false,
      message:
        quizCopy.empty.description,
      reason: "not_enough_facts",
    };
  }

  const payload: QuizSessionInsert = {
    score: 0,
    total_questions: questions.length,
    user_id: auth.user.id,
  };
  const { data: session, error: sessionError } = await auth.supabase
    .from("quiz_sessions")
    .insert(payload)
    .select("id")
    .single();

  if (sessionError) {
    return {
      ok: false,
      message: memoryError(sessionError, "create memory challenge session", "quiz_sessions"),
    };
  }

  return {
    ok: true,
    session: {
      id: session.id,
      questions,
    },
  };
}

export async function saveMemoryChallengeAnswer({
  correctAnswer,
  factId,
  isCorrect,
  selectedAnswer,
  sessionId,
}: {
  correctAnswer: string;
  factId: string;
  isCorrect: boolean;
  selectedAnswer: string;
  sessionId: string;
}) {
  const auth = await getAuthenticatedMemoryClient();

  if (!auth.ok) {
    return { ok: false as const, message: auth.message };
  }

  const payload: QuizAnswerInsert = {
    correct_answer: correctAnswer,
    fact_id: factId,
    is_correct: isCorrect,
    selected_answer: selectedAnswer,
    session_id: sessionId,
    user_id: auth.user.id,
  };
  const { error } = await auth.supabase.from("quiz_answers").insert(payload);

  if (error) {
    return {
      ok: false as const,
      message: memoryError(error, "save memory challenge answer", "quiz_answers"),
    };
  }

  return { ok: true as const };
}

export async function completeMemoryChallengeSession({
  score,
  sessionId,
}: {
  score: number;
  sessionId: string;
}) {
  const auth = await getAuthenticatedMemoryClient();

  if (!auth.ok) {
    return { ok: false as const, message: auth.message };
  }

  const { error } = await auth.supabase
    .from("quiz_sessions")
    .update({
      completed_at: new Date().toISOString(),
      score,
    })
    .eq("id", sessionId)
    .eq("user_id", auth.user.id);

  if (error) {
    return {
      ok: false as const,
      message: memoryError(error, "complete memory challenge session", "quiz_sessions"),
    };
  }

  return { ok: true as const };
}

export { MIN_MEMORY_FACTS };
