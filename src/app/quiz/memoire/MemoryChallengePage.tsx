"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { Brain, Check, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import QuizConfetti from "../../components/QuizConfetti";

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

function ContextReminder({ context }: { context?: string | null }) {
  if (!context?.trim()) {
    return null;
  }

  return (
    <div className="mx-auto mt-5 max-w-xl rounded-[18px] border border-white/10 bg-black/18 px-4 py-3 text-left">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f4ead5]/64">
        Rappel
      </p>
      <p className="mt-2 text-sm font-semibold leading-7 text-white/72">
        {context}
      </p>
    </div>
  );
}

function MemoryLoadingState() {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.055] p-8 text-white/68 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6ae3c0]/60 to-transparent" />
      <div className="flex items-center gap-4">
        <span className="memory-loader grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.06] text-[#6ae3c0]">
          <Brain className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-white/42">
            Défi mémoire
          </p>
          <p className="mt-1 text-lg font-extrabold text-white">
            Préparation du défi mémoire...
          </p>
        </div>
      </div>
    </div>
  );
}

function ChallengeContent() {
  const confettiTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const feedbackRevealTimerRef = useRef<number | null>(null);
  const [session, setSession] = useState<MemoryChallengeSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shakingAnswerId, setShakingAnswerId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
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

  const clearAnimationTimers = useCallback(() => {
    if (confettiTimerRef.current) {
      window.clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = null;
    }

    if (shakeTimerRef.current) {
      window.clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = null;
    }

    if (feedbackRevealTimerRef.current) {
      window.clearTimeout(feedbackRevealTimerRef.current);
      feedbackRevealTimerRef.current = null;
    }
  }, []);

  const triggerCorrectAnswerAnimation = useCallback(() => {
    clearAnimationTimers();
    setShakingAnswerId(null);
    setShowConfetti(false);
    requestAnimationFrame(() => {
      setShowConfetti(true);
      confettiTimerRef.current = window.setTimeout(() => {
        setShowConfetti(false);
        confettiTimerRef.current = null;
      }, 1100);
    });
  }, [clearAnimationTimers]);

  const triggerWrongAnswerAnimation = useCallback((answerId: string) => {
    clearAnimationTimers();
    setShowConfetti(false);
    setShakingAnswerId(null);
    requestAnimationFrame(() => {
      setShakingAnswerId(answerId);
      shakeTimerRef.current = window.setTimeout(() => {
        setShakingAnswerId(null);
        shakeTimerRef.current = null;
      }, 430);
    });
  }, [clearAnimationTimers]);

  const startSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSession(null);
    setAnswers([]);
    setSelectedAnswer(null);
    setShakingAnswerId(null);
    setShowConfetti(false);
    setFeedback(null);
    setCurrentIndex(0);
    setIsCompleted(false);
    setResultMessage("");
    clearAnimationTimers();

    const result = await createMemoryChallengeSession();

    if (!result.ok) {
      setError(result.message);
      setIsLoading(false);
      return;
    }

    setSession(result.session);
    setIsLoading(false);
  }, [clearAnimationTimers]);

  useEffect(() => {
    queueMicrotask(() => {
      void startSession();
    });

    return () => {
      clearAnimationTimers();
    };
  }, [startSession, clearAnimationTimers]);

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
    if (isCorrect) {
      triggerCorrectAnswerAnimation();
    } else {
      triggerWrongAnswerAnimation(answer);
    }

    const nextFeedback: FeedbackState = {
      detail: isCorrect ? "" : currentQuestion.correctAnswer,
      isCorrect,
      question: currentQuestion,
      selectedAnswer: answer,
      title: isCorrect ? "Bonne réponse" : "Mauvaise réponse",
    };
    setAnswers((current) => [...current, nextFeedback]);
    feedbackRevealTimerRef.current = window.setTimeout(() => {
      setFeedback(nextFeedback);
      feedbackRevealTimerRef.current = null;
    }, 120);

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

    setIsSaving(false);
  }

  async function goNext() {
    if (!session) {
      return;
    }

    const nextIndex = currentIndex + 1;
    setFeedback(null);
    setSelectedAnswer(null);
    setShakingAnswerId(null);
    setShowConfetti(false);
    clearAnimationTimers();

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
    return <MemoryLoadingState />;
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
          <Link
            href="/quiz"
            className={`${premiumPrimaryCtaClassName} justify-center`}
          >
            <Brain className="mr-2 h-4 w-4" aria-hidden="true" />
            {quizCopy.buttons.returnQuiz}
          </Link>
          <button
            type="button"
            onClick={() => void startSession()}
            className="inline-flex justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-black text-white/70 transition hover:border-white/24 hover:text-white"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {quizCopy.buttons.relaunch}
          </button>
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
      <QuizConfetti active={showConfetti} />
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
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r from-[#ffd166] to-[#6ae3c0] transition-[width] duration-500 ${
            feedback?.isCorrect ? "quiz-progress-correct-pulse" : ""
          }`}
          style={{
            width: `${Math.round(
              ((currentIndex + (feedback ? 1 : 0)) /
                session.questions.length) *
                100,
            )}%`,
          }}
        />
      </div>

      <div
        key={`${currentQuestion.factId}-${currentIndex}`}
        className={`memory-flip mt-7 ${feedback ? "is-flipped" : ""}`}
      >
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
              const hasAnswered = Boolean(selectedAnswer || feedback);
              const isCorrect =
                hasAnswered && option === currentQuestion.correctAnswer;
              const isWrongSelected =
                hasAnswered && isSelected && !isCorrect;
              const isMuted = hasAnswered && !isSelected && !isCorrect;

              return (
                <button
                  key={option}
                  type="button"
                  disabled={Boolean(feedback) || isSaving}
                  onClick={() => void chooseAnswer(option)}
                  className={`memory-answer flex items-start justify-between gap-4 rounded-[20px] border px-4 py-4 text-left text-sm font-bold leading-7 transition ${
                    isCorrect
                      ? "memory-answer-correct border-emerald-300/40 bg-emerald-400/12 text-emerald-50"
                      : isWrongSelected
                        ? "memory-answer-wrong border-rose-200/30 bg-rose-300/10 text-white"
                        : isMuted
                          ? "memory-answer-muted border-white/8 bg-black/10 text-white/36"
                          : "border-white/10 bg-black/16 text-white/72 hover:border-white/24 hover:bg-white/[0.055]"
                  } ${shakingAnswerId === option ? "quiz-answer-shake" : ""}`}
                >
                  <span className="min-w-0 whitespace-normal break-words">{option}</span>
                  {isCorrect ? <Check className="memory-check h-4 w-4 shrink-0" /> : null}
                  {isWrongSelected ? <X className="h-4 w-4 shrink-0 text-amber-100/70" /> : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="memory-face memory-back">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(106,227,192,0.22),transparent_45%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#6ae3c0]/70 to-transparent memory-shine" />
          <div
            className={`relative grid min-h-[inherit] place-items-center rounded-[26px] border p-6 text-center ${
              feedback?.isCorrect
                ? "border-emerald-200/20 bg-emerald-300/10 shadow-[0_0_90px_rgba(106,227,192,0.16)]"
                : "border-amber-200/18 bg-amber-300/[0.08] shadow-[0_0_76px_rgba(255,209,102,0.12)]"
            }`}
          >
            <div>
              <div
                className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-[#07111f] memory-success-pulse ${
                  feedback?.isCorrect
                    ? "bg-[#6ae3c0] shadow-[0_0_48px_rgba(106,227,192,0.36)]"
                    : "bg-[#ffd166] shadow-[0_0_44px_rgba(255,209,102,0.24)]"
                }`}
              >
                {feedback?.isCorrect ? (
                  <Check className="h-8 w-8" />
                ) : (
                  <X className="h-8 w-8" />
                )}
              </div>
              <p className="mt-6 text-2xl font-black tracking-[-0.04em] text-white">
                {feedback?.title}
              </p>
              {feedback && !feedback.isCorrect ? (
                <div className="mx-auto mt-4 max-w-md rounded-[18px] border border-white/10 bg-black/18 px-4 py-3 text-left">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f4ead5]/64">
                    La bonne réponse était
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-white/82">
                    {feedback.detail}
                  </p>
                </div>
              ) : null}
              <ContextReminder context={feedback?.question.factContext} />
              <button
                type="button"
                onClick={() => void goNext()}
                disabled={isSaving}
                className={`${premiumPrimaryCtaClassName} memory-next-button mt-7 justify-center`}
              >
                {isSaving
                  ? "Enregistrement..."
                  : currentIndex + 1 === session.questions.length
                    ? quizCopy.buttons.result
                    : quizCopy.buttons.continue}
              </button>
            </div>
          </div>
        </div>
      </div>

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
          animation: memoryQuestionEnter 280ms ease-out both;
        }

        .memory-face {
          backface-visibility: hidden;
          grid-area: 1 / 1;
          min-height: inherit;
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

        .memory-loader {
          animation: memoryLoaderPulse 1.4s ease-in-out infinite;
        }

        .memory-answer {
          animation: memoryAnswerEnter 280ms ease-out both;
        }

        .memory-answer-correct {
          box-shadow:
            0 0 0 1px rgba(106, 227, 192, 0.16),
            0 0 58px rgba(106, 227, 192, 0.25),
            0 0 32px rgba(255, 209, 102, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .memory-answer-wrong {
          animation: memoryShake 380ms cubic-bezier(0.36, 0.07, 0.19, 0.97)
            both;
          box-shadow:
            0 0 0 1px rgba(251, 113, 133, 0.12),
            0 0 42px rgba(251, 113, 133, 0.16);
        }

        .memory-answer-muted {
          opacity: 0.58;
          filter: saturate(0.5);
        }

        .memory-check {
          animation: memoryCheck 360ms cubic-bezier(0.21, 0.82, 0.27, 1.25)
            both;
        }

        .memory-next-button {
          animation: memoryNextButton 360ms ease-out both;
        }

        @keyframes memoryQuestionEnter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes memoryAnswerEnter {
          from {
            opacity: 0;
            transform: translateY(7px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
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

        @keyframes memoryLoaderPulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(106, 227, 192, 0.12);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(106, 227, 192, 0);
            transform: scale(1.04);
          }
        }

        .memory-correct-halo {
          animation: memoryHalo 900ms ease-out both;
        }

        @keyframes memoryShake {
          0%,
          100% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-7px);
          }
          40% {
            transform: translateX(7px);
          }
          60% {
            transform: translateX(-5px);
          }
          80% {
            transform: translateX(4px);
          }
        }

        @keyframes memoryCheck {
          from {
            opacity: 0;
            transform: scale(0.72) rotate(-12deg);
          }
          70% {
            transform: scale(1.12) rotate(0deg);
          }
          to {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes memoryNextButton {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
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

        @media (prefers-reduced-motion: reduce) {
          .memory-loader,
          .memory-flip,
          .memory-answer,
          .memory-answer-wrong,
          .memory-check,
          .memory-next-button,
          .memory-shine,
          .memory-success-pulse,
          .memory-correct-halo {
            animation: none;
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
          <div id="quiz-container" className="scroll-mt-28">
            <ChallengeContent />
          </div>
        </main>
        <Footer />
      </div>
    </RequireAuth>
  );
}
