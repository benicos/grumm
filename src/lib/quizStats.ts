import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type QuizSessionRow = Pick<
  Database["public"]["Tables"]["quiz_sessions"]["Row"],
  "completed_at" | "id" | "score" | "total_questions"
>;

type QuizAnswerRow = Pick<
  Database["public"]["Tables"]["quiz_answers"]["Row"],
  "answered_at" | "is_correct" | "session_id"
>;

export type UserQuizStats = {
  averageScorePercent: number | null;
  bestCorrectAnswerStreak: number;
  bestScorePercent: number | null;
  completedSessions: number;
  correctAnswers: number;
};

function scorePercent(session: QuizSessionRow) {
  return Math.round((session.score / Math.max(session.total_questions, 1)) * 100);
}

function getBestCorrectAnswerStreak(rows: QuizAnswerRow[]) {
  const answersBySession = new Map<string, QuizAnswerRow[]>();

  rows.forEach((row) => {
    answersBySession.set(row.session_id, [
      ...(answersBySession.get(row.session_id) ?? []),
      row,
    ]);
  });

  let bestStreak = 0;

  answersBySession.forEach((answers) => {
    let runningStreak = 0;

    [...answers]
      .sort((a, b) => a.answered_at.localeCompare(b.answered_at))
      .forEach((answer) => {
        runningStreak = answer.is_correct ? runningStreak + 1 : 0;
        bestStreak = Math.max(bestStreak, runningStreak);
      });
  });

  return bestStreak;
}

export async function getUserQuizStats(): Promise<UserQuizStats | null> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const [sessionsResult, answersResult] = await Promise.all([
    supabase
      .from("quiz_sessions")
      .select("id,completed_at,score,total_questions")
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(100),
    supabase
      .from("quiz_answers")
      .select("answered_at,is_correct,session_id")
      .eq("user_id", user.id)
      .order("answered_at", { ascending: true })
      .limit(500),
  ]);

  if (sessionsResult.error ?? answersResult.error) {
    throw sessionsResult.error ?? answersResult.error;
  }

  const sessions = ((sessionsResult.data ?? []) as QuizSessionRow[]).filter(
    (session) => session.completed_at && session.total_questions > 0,
  );
  const completedSessionIds = new Set(sessions.map((session) => session.id));
  const answers = ((answersResult.data ?? []) as QuizAnswerRow[]).filter((answer) =>
    completedSessionIds.has(answer.session_id),
  );
  const completedSessions = sessions.length;
  const correctAnswers = sessions.reduce((sum, session) => sum + session.score, 0);
  const totalQuestions = sessions.reduce(
    (sum, session) => sum + session.total_questions,
    0,
  );
  const bestScorePercent =
    completedSessions > 0 ? Math.max(...sessions.map(scorePercent)) : null;
  const averageScorePercent =
    totalQuestions > 0
      ? Math.round((correctAnswers / Math.max(totalQuestions, 1)) * 100)
      : null;

  return {
    averageScorePercent,
    bestCorrectAnswerStreak: getBestCorrectAnswerStreak(answers),
    bestScorePercent,
    completedSessions,
    correctAnswers,
  };
}
