"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { Brain, Check, RotateCcw, X } from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";
import {
  getRandomQuizCopy,
  getRandomQuizResultCopy,
  quizCopy,
} from "@/config/quizCopy";
import { publicSiteTexts } from "@/config/site-texts";
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
import Footer from "../../components/Footer";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

type AnswerState = {
  isCorrect: boolean;
  question: MemoryChallengeQuestion;
  selectedAnswer: string;
};

type FeedbackState = AnswerState & {
  detail: string;
  title: string;
};

const confettiPieces = [
  { color: "#f4ead5", x: "-48px", y: "-42px", rotate: "-24deg" },
  { color: "#c5ccd6", x: "-22px", y: "-64px", rotate: "18deg" },
  { color: "#6ae3c0", x: "18px", y: "-58px", rotate: "34deg" },
  { color: "#ffd166", x: "48px", y: "-36px", rotate: "-18deg" },
] as const;

function SoberConfetti({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <div aria-hidden className="pointer-events-none absolute right-6 top-5 h-16 w-24">
      {confettiPieces.map((piece, index) => (
        <span
          key={`${piece.color}-${index}`}
          className="quiz-confetti-piece"
          style={
            {
              "--quiz-confetti-color": piece.color,
              "--quiz-confetti-delay": `${index * 55}ms`,
              "--quiz-confetti-rotate": piece.rotate,
              "--quiz-confetti-x": piece.x,
              "--quiz-confetti-y": piece.y,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function ChallengeContent() {
  const [session, setSession] = useState<MemoryChallengeSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
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
    setResultMessage("");

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
    queueMicrotask(() => {
      void startSession();
    });
  }, []);

  useEffect(() => {
    if (!feedback?.isCorrect || typeof navigator === "undefined") {
      return;
    }

    navigator.vibrate?.(38);
  }, [feedback]);

  async function chooseAnswer(answer: string) {
    if (!session || !currentQuestion || feedback || isSaving) {
      return;
    }

    setSelectedAnswer(answer);
    setIsSaving(true);

    const isCorrect = answer === currentQuestion.correctAnswer;
    const correctCopy = isCorrect ? getRandomQuizCopy("correctFeedback") : null;
    const wrongCopy = isCorrect ? null : getRandomQuizCopy("wrongFeedback");
    const nextFeedback: FeedbackState = {
      detail: isCorrect
        ? correctCopy?.detail ?? ""
        : `${wrongCopy?.detailPrefix ?? ""} ${currentQuestion.correctAnswer}`.trim(),
      isCorrect,
      question: currentQuestion,
      selectedAnswer: answer,
      title: correctCopy?.title ?? wrongCopy?.title ?? "",
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
    setResultMessage(
      getRandomQuizResultCopy(finalScore, session.questions.length),
    );
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
        {quizCopy.loading}
      </div>
    );
  }

  if (error && !session) {
    return (
      <AppState
        eyebrow="Défi mémoire"
        title={quizCopy.empty.title}
        description={error}
        primaryHref="/decouvrir"
        primaryLabel={quizCopy.empty.primaryLabel}
        secondaryHref="/profil"
        secondaryLabel={quizCopy.buttons.returnProfile}
      />
    );
  }

  if (!session || !currentQuestion) {
    return null;
  }

  if (isCompleted) {
    return (
      <section className="mx-auto max-w-5xl rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.026))] p-6 text-center shadow-[0_28px_90px_rgba(0,0,0,0.26)] backdrop-blur-2xl sm:p-8">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#6ae3c0]">
          <Brain className="h-4 w-4" />
          Résultat
        </p>
        <h1 className="mt-4 text-[clamp(3rem,10vw,6rem)] font-black leading-none tracking-[-0.07em] text-white">
          {score}/{session.questions.length}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base font-semibold leading-8 text-white/66">
          {resultMessage}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void startSession()}
            className={`${premiumPrimaryCtaClassName} justify-center`}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {quizCopy.buttons.relaunch}
          </button>
          <Link
            href="/profil"
            className="inline-flex justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-black text-white/70 transition hover:border-white/24 hover:text-white"
          >
            {quizCopy.buttons.returnProfile}
          </Link>
        </div>

        <div className="mt-8 divide-y divide-white/10 text-left">
          {answers.map((answer, index) => (
            <Link
              key={`${answer.question.factId}-${index}`}
              href={`/fait/${answer.question.factSlug}`}
              className="flex items-start justify-between gap-4 py-4 text-sm font-semibold text-white/62 transition hover:text-white"
            >
              <span>
                {quizCopy.buttons.reviewPrefix} {answer.question.factTitle}
              </span>
              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${
                  answer.isCorrect
                    ? "border-emerald-200/20 bg-emerald-300/10 text-emerald-100"
                    : "border-amber-200/20 bg-amber-300/10 text-amber-100"
                }`}
              >
                {answer.isCorrect ? "✓" : "✕"}{" "}
                {answer.isCorrect
                  ? publicSiteTexts.memoryResult.correct
                  : publicSiteTexts.memoryResult.wrong}
              </span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="relative mx-auto max-w-5xl overflow-hidden rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_82%_12%,rgba(244,234,213,0.105),transparent_30%),linear-gradient(145deg,rgba(255,255,255,0.074),rgba(255,255,255,0.024))] p-5 shadow-[0_26px_88px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8">
      <SoberConfetti active={Boolean(feedback?.isCorrect)} />
      {feedback?.isCorrect ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[30px] border border-emerald-200/25 shadow-[0_0_90px_rgba(106,227,192,0.18)] memory-correct-halo"
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-[#6ae3c0]">
          <Brain className="h-4 w-4" />
          Défi mémoire
        </p>
        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-black text-white/54">
          {currentIndex + 1}/{session.questions.length}
        </span>
      </div>

      <div className={`memory-flip mt-7 ${feedback?.isCorrect ? "is-flipped" : ""}`}>
        <div className="memory-face memory-front">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-white/44">
            {currentQuestion.prompt}
          </p>
          <h1 className="mt-3 max-w-2xl text-[clamp(1.65rem,4.8vw,3.1rem)] font-black leading-[1.02] tracking-[-0.045em] text-white">
            {currentQuestion.title}
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
                  className={`flex items-start justify-between gap-4 rounded-[20px] border px-4 py-4 text-left text-sm font-bold leading-7 transition ${
                    isCorrect
                      ? "border-emerald-300/35 bg-emerald-400/12 text-emerald-50"
                      : isWrongSelected
                        ? "border-amber-200/24 bg-amber-100/8 text-white/82"
                        : "border-white/10 bg-black/16 text-white/72 hover:border-white/24 hover:bg-white/[0.055]"
                  }`}
                >
                  <span className="min-w-0 whitespace-normal break-words">{option}</span>
                  {isCorrect ? <Check className="h-4 w-4 shrink-0" /> : null}
                  {isWrongSelected ? <X className="h-4 w-4 shrink-0 text-amber-100/70" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="memory-face memory-back">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(106,227,192,0.22),transparent_45%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6ae3c0]/70 to-transparent memory-shine" />
          <div className="relative grid min-h-[360px] place-items-center rounded-[26px] border border-emerald-200/20 bg-emerald-300/10 p-6 text-center shadow-[0_0_90px_rgba(106,227,192,0.16)]">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#6ae3c0] text-[#07111f] shadow-[0_0_48px_rgba(106,227,192,0.36)] memory-success-pulse">
                <Check className="h-8 w-8" />
              </div>
              <p className="mt-6 text-2xl font-black tracking-[-0.04em] text-white">
                {feedback?.title}
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-7 text-white/66">
                {feedback?.detail}
              </p>
              <button
                type="button"
                onClick={() => void goNext()}
                className={`${premiumPrimaryCtaClassName} mt-7 justify-center`}
              >
                {currentIndex + 1 === session.questions.length
                  ? quizCopy.buttons.result
                  : quizCopy.buttons.continue}
              </button>
            </div>
          </div>
        </div>
      </div>

      {feedback && !feedback.isCorrect ? (
        <div className="mt-6 rounded-[22px] border border-white/10 bg-black/18 p-4">
          <p className="text-lg font-black text-white">{feedback.title}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/62">
            {feedback.detail}
          </p>
          <button
            type="button"
            onClick={() => void goNext()}
            className={`${premiumPrimaryCtaClassName} mt-5 justify-center`}
          >
            {currentIndex + 1 === session.questions.length
              ? quizCopy.buttons.result
              : quizCopy.buttons.continue}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-5 rounded-md border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
          {error}
        </p>
      ) : null}

      <style jsx>{`
        .memory-flip {
          display: grid;
          min-height: 360px;
          perspective: 1400px;
        }

        .memory-face {
          backface-visibility: hidden;
          grid-area: 1 / 1;
          transform-style: preserve-3d;
          transition:
            transform 620ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 420ms ease,
            filter 420ms ease;
        }

        .memory-front {
          transform: rotateY(0deg);
        }

        .memory-back {
          opacity: 0;
          position: relative;
          transform: rotateY(180deg) translateY(8px);
        }

        .memory-flip.is-flipped .memory-front {
          filter: blur(2px);
          opacity: 0;
          transform: rotateY(-180deg) translateY(-8px);
        }

        .memory-flip.is-flipped .memory-back {
          opacity: 1;
          transform: rotateY(0deg) translateY(0);
        }

        .memory-shine {
          animation: memoryShine 1.2s ease-out both;
        }

        .memory-success-pulse {
          animation: memoryPulse 1.25s ease-out both;
        }

        @keyframes memoryShine {
          from {
            opacity: 0;
            transform: translateX(-35%);
          }
          35% {
            opacity: 1;
          }
          to {
            opacity: 0;
            transform: translateX(35%);
          }
        }

        @keyframes memoryPulse {
          0% {
            transform: scale(0.82);
          }
          55% {
            transform: scale(1.08);
          }
          100% {
            transform: scale(1);
          }
        }

        .memory-correct-halo {
          animation: memoryHalo 900ms ease-out both;
        }

        @keyframes memoryHalo {
          0% {
            opacity: 0;
            transform: scale(0.985);
          }
          35% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: scale(1.01);
          }
        }
      `}</style>
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
        <main className="relative z-10 mx-auto w-full max-w-[1120px] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="mb-5 flex flex-wrap items-center justify-end gap-4">
            <Link
              href="/profil"
              className="rounded-full border border-white/12 px-5 py-3 text-sm font-black text-white/70 transition hover:border-white/24 hover:text-white"
            >
              {quizCopy.buttons.returnProfile}
            </Link>
          </div>
          <ChallengeContent />
        </main>
        <Footer />
      </div>
    </RequireAuth>
  );
}
