"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { Brain, Check, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  completeMemoryChallengeSession,
  createMemoryChallengeSession,
  saveMemoryChallengeAnswer,
  type MemoryChallengeQuestion,
  type MemoryChallengeSession,
} from "@/lib/memoryChallenge";
import RequireAuth from "../../auth/RequireAuth";
import { AppState } from "../../components/AppState";
import { premiumPrimaryCtaClassName } from "../../components/buttonStyles";
import HeroBackground from "../../components/HeroBackground";
import Navbar from "../../components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

type AnswerState = {
  isCorrect: boolean;
  question: MemoryChallengeQuestion;
  selectedAnswer: string;
};

function getResultMessage(score: number, total: number) {
  const ratio = score / Math.max(total, 1);

  if (ratio >= 0.8) {
    return "Bien vu. Ces faits sont déjà bien installés.";
  }

  if (ratio >= 0.5) {
    return "Tu en avais gardé une bonne partie. Une autre passe et ça restera.";
  }

  return "Ça revient doucement. Relire les faits suffit souvent à les ancrer.";
}

function ChallengeContent() {
  const [session, setSession] = useState<MemoryChallengeSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<AnswerState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentQuestion = session?.questions[currentIndex] ?? null;
  const score = useMemo(
    () => answers.filter((answer) => answer.isCorrect).length,
    [answers],
  );

  async function startSession() {
    setIsLoading(true);
    setError(null);
    setSession(null);
    setAnswers([]);
    setSelectedAnswer(null);
    setFeedback(null);
    setCurrentIndex(0);
    setIsCompleted(false);

    const result = await createMemoryChallengeSession();

    if (!result.ok) {
      setError(result.message);
      setIsLoading(false);
      return;
    }

    setSession(result.session);
    setIsLoading(false);
  }

  useEffect(() => {
    void startSession();
  }, []);

  async function chooseAnswer(answer: string) {
    if (!session || !currentQuestion || feedback || isSaving) {
      return;
    }

    setSelectedAnswer(answer);
    setIsSaving(true);

    const isCorrect = answer === currentQuestion.correctAnswer;
    const nextFeedback = {
      isCorrect,
      question: currentQuestion,
      selectedAnswer: answer,
    };
    const saveResult = await saveMemoryChallengeAnswer({
      correctAnswer: currentQuestion.correctAnswer,
      factId: currentQuestion.factId,
      isCorrect,
      selectedAnswer: answer,
      sessionId: session.id,
    });

    if (!saveResult.ok) {
      setError(saveResult.message);
      setIsSaving(false);
      return;
    }

    setAnswers((current) => [...current, nextFeedback]);
    setFeedback(nextFeedback);
    setIsSaving(false);
  }

  async function goNext() {
    if (!session) {
      return;
    }

    const nextIndex = currentIndex + 1;
    setFeedback(null);
    setSelectedAnswer(null);

    if (nextIndex < session.questions.length) {
      setCurrentIndex(nextIndex);
      return;
    }

    const finalScore = answers.filter((answer) => answer.isCorrect).length;
    const result = await completeMemoryChallengeSession({
      score: finalScore,
      sessionId: session.id,
    });

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setIsCompleted(true);
  }

  if (isLoading) {
    return (
      <div className="rounded-[30px] border border-white/10 bg-white/[0.055] p-8 text-white/62 backdrop-blur-xl">
        Préparation de ton défi mémoire...
      </div>
    );
  }

  if (error && !session) {
    return (
      <AppState
        eyebrow="Défi mémoire"
        title="Pas encore prêt."
        description={error}
        primaryHref="/discover"
        primaryLabel="Lire quelques faits"
        secondaryHref="/profile"
        secondaryLabel="Retour profil"
      />
    );
  }

  if (!session || !currentQuestion) {
    return null;
  }

  if (isCompleted) {
    return (
      <section className="mx-auto max-w-3xl rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.085),rgba(255,255,255,0.032))] p-6 text-center shadow-[0_34px_120px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#6ae3c0]">
          <Brain className="h-4 w-4" />
          Résultat
        </p>
        <h1 className="mt-4 text-[clamp(3rem,10vw,6rem)] font-black leading-none tracking-[-0.07em] text-white">
          {score}/{session.questions.length}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base font-semibold leading-8 text-white/66">
          {getResultMessage(score, session.questions.length)}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void startSession()}
            className={`${premiumPrimaryCtaClassName} justify-center`}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Relancer
          </button>
          <Link
            href="/profile"
            className="inline-flex justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-black text-white/70 transition hover:border-white/24 hover:text-white"
          >
            Retour profil
          </Link>
        </div>

        <div className="mt-8 divide-y divide-white/10 text-left">
          {answers.map((answer) => (
            <Link
              key={answer.question.factId}
              href={`/fact/${answer.question.factSlug}`}
              className="block py-4 text-sm font-semibold text-white/62 transition hover:text-white"
            >
              Relire : {answer.question.title}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_82%_18%,rgba(106,227,192,0.12),transparent_28%),linear-gradient(145deg,rgba(255,255,255,0.085),rgba(255,255,255,0.032))] p-5 shadow-[0_34px_120px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#6ae3c0]">
          <Brain className="h-4 w-4" />
          Défi mémoire
        </p>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-white/54">
          {currentIndex + 1}/{session.questions.length}
        </span>
      </div>

      <h1 className="mt-6 text-[clamp(2rem,6vw,4rem)] font-black leading-[0.98] tracking-[-0.06em] text-white">
        {currentQuestion.prompt}
      </h1>

      <div className="mt-8 grid gap-3">
        {currentQuestion.options.map((option) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = feedback && option === currentQuestion.correctAnswer;
          const isWrongSelected = feedback && isSelected && !isCorrect;

          return (
            <button
              key={option}
              type="button"
              disabled={Boolean(feedback) || isSaving}
              onClick={() => void chooseAnswer(option)}
              className={`flex items-center justify-between gap-4 rounded-[20px] border px-4 py-4 text-left text-sm font-bold leading-6 transition ${
                isCorrect
                  ? "border-emerald-300/35 bg-emerald-400/12 text-emerald-50"
                  : isWrongSelected
                    ? "border-red-300/30 bg-red-500/10 text-red-50"
                    : "border-white/10 bg-black/16 text-white/72 hover:border-white/24 hover:bg-white/[0.055]"
              }`}
            >
              <span>{option}</span>
              {isCorrect ? <Check className="h-4 w-4 shrink-0" /> : null}
              {isWrongSelected ? <X className="h-4 w-4 shrink-0" /> : null}
            </button>
          );
        })}
      </div>

      {feedback ? (
        <div className="mt-6 rounded-[22px] border border-white/10 bg-black/18 p-4">
          <p className="text-lg font-black text-white">
            {feedback.isCorrect ? "Bien vu." : "Presque."}
          </p>
          {!feedback.isCorrect ? (
            <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
              La bonne réponse était : {feedback.question.correctAnswer}
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
              Tu l'avais retenu.
            </p>
          )}
          <button
            type="button"
            onClick={() => void goNext()}
            className={`${premiumPrimaryCtaClassName} mt-5 justify-center`}
          >
            {currentIndex + 1 === session.questions.length
              ? "Voir le résultat"
              : "Continuer"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-5 rounded-md border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default function MemoryChallengePage() {
  return (
    <RequireAuth>
      <div
        className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#132338] text-white`}
      >
        <HeroBackground />
        <Navbar />
        <main className="relative z-10 mx-auto w-full max-w-[980px] px-6 py-12 sm:py-16 lg:px-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="w-fit rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-sm/6 font-semibold text-white/62 backdrop-blur-xl">
                Réviser
              </p>
              <h1 className="mt-5 text-[clamp(2.4rem,7vw,5.4rem)] font-black leading-[0.92] tracking-[-0.065em] text-white">
                Défi mémoire
              </h1>
            </div>
            <Link
              href="/profile"
              className="rounded-full border border-white/12 px-5 py-3 text-sm font-black text-white/70 transition hover:border-white/24 hover:text-white"
            >
              Retour profil
            </Link>
          </div>
          <ChallengeContent />
        </main>
      </div>
    </RequireAuth>
  );
}
