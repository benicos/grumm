"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { ArrowLeft, Check, RotateCcw, Sparkles, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createGeneralQuizSession,
  persistGeneralQuizResult,
  type GeneralQuizAnswer,
  type GeneralQuizQuestion,
} from "@/lib/generalQuiz";
import { trackAnalyticsEvent } from "@/lib/analytics/web";
import { quizDifficultyLabels } from "@/lib/quizShared";
import Footer from "../../components/Footer";
import HeroBackground from "../../components/HeroBackground";
import Navbar from "../../components/Navbar";
import QuizConfetti from "../../components/QuizConfetti";
import {
  premiumPrimaryCtaClassName,
} from "../../components/buttonStyles";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const correctFeedback = [
  "Bonne réponse.",
  "Réponse validée.",
  "C'est la bonne réponse.",
] as const;

const wrongFeedback = [
  "Mauvaise réponse.",
  "Ce n'était pas la bonne réponse.",
  "Correction nécessaire.",
] as const;

type AnswerState = GeneralQuizAnswer & {
  categoryName: string;
  categorySlug: string;
  difficulty: string;
  factContext: string | null;
  factSlug: string;
  factTitle: string;
};

function pickFeedback(values: readonly string[], key: string) {
  const index =
    [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0) %
    values.length;

  return values[index];
}

function resultMessage(score: number) {
  if (score <= 3) {
    return "Pas grave, le quiz est aussi fait pour apprendre.";
  }

  if (score <= 6) {
    return "Bonne base, quelques détails t'ont échappé.";
  }

  if (score <= 8) {
    return "Très solide.";
  }

  return "Excellent score.";
}

function summarizeThemes(answers: AnswerState[]) {
  const stats = [
    ...answers
      .reduce((map, answer) => {
        const current = map.get(answer.categoryName) ?? {
          correct: 0,
          missed: 0,
          total: 0,
        };
        map.set(answer.categoryName, {
          correct: current.correct + (answer.isCorrect ? 1 : 0),
          missed: current.missed + (answer.isCorrect ? 0 : 1),
          total: current.total + 1,
        });
        return map;
      }, new Map<string, { correct: number; missed: number; total: number }>())
      .entries(),
  ];

  const missed = stats
    .filter(([, stat]) => stat.missed > 0)
    .sort((a, b) => b[1].missed - a[1].missed || b[1].total - a[1].total)
    .slice(0, 2)
    .map(([theme]) => theme);

  if (missed.length > 0) {
    return `Tu as surtout hésité sur : ${missed.join(", ")}.`;
  }

  const mastered = stats
    .filter(([, stat]) => stat.total > 0 && stat.correct === stat.total)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 2)
    .map(([theme]) => theme);

  if (mastered.length > 0) {
    return `Tes meilleurs résultats aujourd'hui : ${mastered.join(", ")}.`;
  }

  return null;
}

function shortExcerpt(value: string | null) {
  if (!value) {
    return null;
  }

  return value.length > 180 ? `${value.slice(0, 177).trim()}...` : value;
}

function LoadingState() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
      <div className="flex items-center gap-4">
        <span className="quiz-loader grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/[0.06] text-[#ffd166]">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/42">
            Grumm Quiz
          </p>
          <p className="mt-1 text-lg font-extrabold text-white">
            Préparation des questions...
          </p>
        </div>
      </div>
    </div>
  );
}

function SuccessParticles({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return (
    <span className="quiz-particles" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, index) => (
        <span
          key={index}
          className="quiz-particle"
          style={
            {
              "--particle-index": index,
              "--particle-x": `${(index % 4) * 18 - 26}px`,
              "--particle-y": `${Math.floor(index / 4) * -16 - 18}px`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

function ThemeMastery({ answers }: { answers: AnswerState[] }) {
  const stats = [
    ...answers
      .reduce((map, answer) => {
        const current = map.get(answer.categoryName) ?? {
          correct: 0,
          total: 0,
        };
        map.set(answer.categoryName, {
          correct: current.correct + (answer.isCorrect ? 1 : 0),
          total: current.total + 1,
        });
        return map;
      }, new Map<string, { correct: number; total: number }>())
      .entries(),
  ]
    .sort((a, b) => b[1].correct - a[1].correct || b[1].total - a[1].total)
    .slice(0, 4);

  if (stats.length === 0) {
    return null;
  }

  return (
    <div className="mt-7 flex flex-wrap justify-center gap-2">
      {stats.map(([theme, stat]) => (
        <span
          key={theme}
          className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white/68"
        >
          {theme} : {stat.correct}/{stat.total}
        </span>
      ))}
    </div>
  );
}

function QuizFactReview({ answers }: { answers: AnswerState[] }) {
  const orderedFacts = [...answers].sort(
    (a, b) => Number(a.isCorrect) - Number(b.isCorrect),
  );
  const summary = summarizeThemes(answers);

  if (orderedFacts.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 rounded-[28px] border border-white/10 bg-black/18 p-5 text-left sm:p-6">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f4ead5]/58">
          Après le quiz
        </p>
        <h3 className="mt-3 text-2xl font-black tracking-[-0.045em] text-white sm:text-3xl">
          Les faits à relire
        </h3>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/62">
          Commence par les questions manquées, ce sont les meilleures occasions
          de progresser.
        </p>
        {summary ? (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-bold leading-6 text-white/72">
            {summary}
          </p>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {orderedFacts.map((answer, index) => (
          <Link
            key={`${answer.questionId}-${answer.factId}`}
            href={`/fait/${answer.factSlug}`}
            className={`quiz-review-card group rounded-[22px] border p-4 transition ${
              answer.isCorrect
                ? "border-white/10 bg-white/[0.04] hover:border-white/20"
                : "border-amber-200/24 bg-amber-300/[0.075] shadow-[0_18px_50px_rgba(255,209,102,0.06)] hover:border-amber-100/40"
            }`}
            style={{ animationDelay: `${index * 46}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">
                  {answer.categoryName}
                </p>
                <h4 className="mt-2 text-lg font-black leading-tight tracking-[-0.035em] text-white group-hover:text-[#f8f1df]">
                  {answer.factTitle}
                </h4>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                  answer.isCorrect
                    ? "bg-emerald-300/10 text-emerald-100"
                    : "bg-amber-300/12 text-amber-100"
                }`}
              >
                {answer.isCorrect ? "Validé" : "À revoir"}
              </span>
            </div>
            {answer.factContext ? (
              <p className="mt-3 text-sm font-semibold leading-6 text-white/62">
                {shortExcerpt(answer.factContext)}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function QuizExperience() {
  const quizAnchorRef = useRef<HTMLDivElement | null>(null);
  const nextActionRef = useRef<() => void>(() => undefined);
  const isAdvancingRef = useRef(false);
  const confettiTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);
  const [questions, setQuestions] = useState<GeneralQuizQuestion[]>([]);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [shakingAnswerId, setShakingAnswerId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersisting, setIsPersisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const currentQuestion = questions[currentIndex] ?? null;
  const score = answers.filter((answer) => answer.isCorrect).length;
  // Les réponses ratées gardent questionId/factId/slug pour préparer le futur mode "Rejouer mes erreurs".
  const missedAnswers = answers.filter((answer) => !answer.isCorrect);
  const selectedState = useMemo(() => {
    if (!currentQuestion || !selectedAnswer) {
      return null;
    }

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    return {
      isCorrect,
      label: pickFeedback(
        isCorrect ? correctFeedback : wrongFeedback,
        `${currentQuestion.id}:${selectedAnswer}`,
      ),
    };
  }, [currentQuestion, selectedAnswer]);
  const liveScore = score + (selectedState?.isCorrect ? 1 : 0);
  const progressPercent = questions.length
    ? Math.round(
        ((currentIndex + (selectedAnswer || finished ? 1 : 0)) /
          questions.length) *
          100,
      )
    : 0;
  const clearAnimationTimers = useCallback(() => {
    if (confettiTimerRef.current) {
      window.clearTimeout(confettiTimerRef.current);
      confettiTimerRef.current = null;
    }

    if (shakeTimerRef.current) {
      window.clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = null;
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

  function scrollToQuizAnchor(force = false) {
    const node = quizAnchorRef.current;

    if (!node || typeof window === "undefined") {
      return;
    }

    const top = node.getBoundingClientRect().top;
    const shouldScroll = force || top < 72 || top > window.innerHeight * 0.18;

    if (!shouldScroll) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: Math.max(0, window.scrollY + top - 84),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  const loadQuiz = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setFinished(false);
    setAnswers([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShakingAnswerId(null);
    setShowConfetti(false);
    clearAnimationTimers();

    const result = await createGeneralQuizSession();

    if (!result.ok) {
      setQuestions([]);
      setError(result.message);
      setIsLoading(false);
      return;
    }

    setQuestions(result.questions);
    void trackAnalyticsEvent({
      eventName: "quiz_started",
      metadata: {
        question_count: result.questions.length,
        quiz_type: "general",
      },
    });
    setIsLoading(false);
  }, [clearAnimationTimers]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadQuiz();
    });

    return () => {
      clearAnimationTimers();
    };
  }, [loadQuiz, clearAnimationTimers]);

  function chooseAnswer(answer: string) {
    if (!currentQuestion || selectedAnswer) {
      return;
    }

    setSelectedAnswer(answer);
    void trackAnalyticsEvent({
      entityId: currentQuestion.id,
      entityType: "quiz_question",
      eventName: "quiz_question_answered",
      metadata: {
        is_correct: answer === currentQuestion.correctAnswer,
        quiz_type: "general",
      },
    });
    requestAnimationFrame(() => scrollToQuizAnchor(true));

    if (answer === currentQuestion.correctAnswer) {
      navigator.vibrate?.(35);
      triggerCorrectAnswerAnimation();
    } else {
      triggerWrongAnswerAnimation(answer);
    }
  }

  async function goNext() {
    if (
      !currentQuestion ||
      !selectedAnswer ||
      isPersisting ||
      isAdvancingRef.current
    ) {
      return;
    }

    isAdvancingRef.current = true;
    const nextAnswer: AnswerState = {
      categoryName: currentQuestion.categoryName,
      categorySlug: currentQuestion.categorySlug,
      correctAnswer: currentQuestion.correctAnswer,
      difficulty: currentQuestion.difficulty,
      factContext: currentQuestion.factContext,
      factId: currentQuestion.factId,
      factSlug: currentQuestion.factSlug,
      factTitle: currentQuestion.factTitle,
      isCorrect: selectedAnswer === currentQuestion.correctAnswer,
      questionId: currentQuestion.id,
      selectedAnswer,
    };
    const nextAnswers = [...answers, nextAnswer];
    setAnswers(nextAnswers);
    setSelectedAnswer(null);
    setShakingAnswerId(null);
    setShowConfetti(false);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((index) => index + 1);
      isAdvancingRef.current = false;
      requestAnimationFrame(() => scrollToQuizAnchor(true));
      return;
    }

    setIsPersisting(true);
    await persistGeneralQuizResult({
      answers: nextAnswers,
      totalQuestions: questions.length,
    });
    void trackAnalyticsEvent({
      eventName: "quiz_completed",
      metadata: {
        quiz_type: "general",
        score: nextAnswers.filter((answer) => answer.isCorrect).length,
        total_questions: questions.length,
      },
    });
    setIsPersisting(false);
    setFinished(true);
    isAdvancingRef.current = false;
    requestAnimationFrame(() => scrollToQuizAnchor(true));
  }

  useEffect(() => {
    nextActionRef.current = () => {
      void goNext();
    };
  });

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (
        !selectedAnswer ||
        finished ||
        isPersisting ||
        !currentQuestion ||
        !window.matchMedia("(min-width: 768px)").matches ||
        (event.key !== "Enter" && event.key !== "ArrowRight")
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();

      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      nextActionRef.current();
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [currentQuestion, finished, isPersisting, selectedAnswer]);

  return (
    <div
      className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#07111f] text-white`}
    >
      <HeroBackground />
      <Navbar />
      <main className="relative z-10 mx-auto w-full max-w-[1180px] px-5 pb-24 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/quiz"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-sm font-black text-white/54 transition hover:border-white/20 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour aux quiz
        </Link>

        <div className="mt-6 space-y-8">
          <section id="quiz-container" ref={quizAnchorRef} className="scroll-mt-28">
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <section className="rounded-[28px] border border-white/10 bg-white/[0.055] p-7 text-center backdrop-blur-2xl">
                <p className="text-lg font-black text-white">
                  Quiz indisponible
                </p>
                <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-white/60">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => void loadQuiz()}
                  className={`${premiumPrimaryCtaClassName} mt-6`}
                >
                  Réessayer
                </button>
              </section>
            ) : finished ? (
              <section className="quiz-result rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,209,102,0.18),transparent_38%),linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.024))] p-7 text-center shadow-[0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-10">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ffd166]">
                  Résultat
                </p>
                <h2 className="quiz-score mt-4 text-[clamp(4rem,12vw,8rem)] font-black leading-none tracking-[-0.08em] text-white">
                  {score}/10
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-lg font-semibold leading-8 text-white/70">
                  {resultMessage(score)}
                </p>
                <div className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2 text-sm font-bold text-white/68">
                    {questions.length} faits parcourus
                  </span>
                  <span className="rounded-full border border-amber-200/16 bg-amber-300/[0.07] px-4 py-2 text-sm font-bold text-amber-100/78">
                    {missedAnswers.length} à revoir
                  </span>
                </div>
                <ThemeMastery answers={answers} />
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void loadQuiz()}
                    className={premiumPrimaryCtaClassName}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Rejouer
                  </button>
                  <Link
                    href="/decouvrir"
                    className="inline-flex min-h-12 items-center justify-center rounded-[18px] border border-white/12 px-7 py-3.5 text-sm font-black text-white/72 transition hover:border-white/24 hover:text-white"
                  >
                    Découvrir de nouveaux faits
                  </Link>
                </div>
                <QuizFactReview answers={answers} />
              </section>
            ) : currentQuestion ? (
              <section
                key={currentQuestion.id}
                className="quiz-question relative rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_88%_8%,rgba(244,234,213,0.13),transparent_30%),linear-gradient(145deg,rgba(255,255,255,0.074),rgba(255,255,255,0.024))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.26)] backdrop-blur-2xl sm:p-7 lg:p-8"
              >
                <QuizConfetti active={showConfetti} />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-white/42">
                      Question {currentIndex + 1} / {questions.length}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r from-[#ffd166] to-[#6ae3c0] transition-[width] duration-500 ${
                          selectedState?.isCorrect
                            ? "quiz-progress-correct-pulse"
                            : ""
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-white/62">
                      Score {liveScore}/{questions.length}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-white/62">
                      {currentQuestion.categoryName}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-bold text-white/62">
                      {quizDifficultyLabels[currentQuestion.difficulty]}
                    </span>
                  </div>
                </div>

                <h2 className="mt-7 text-[clamp(1.7rem,4.8vw,3.2rem)] font-black leading-[1.02] tracking-[-0.05em] text-white">
                  {currentQuestion.question}
                </h2>

                <div className="mt-7 grid gap-3 md:grid-cols-2">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect =
                      Boolean(selectedAnswer) &&
                      option === currentQuestion.correctAnswer;
                    const isWrong =
                      Boolean(selectedAnswer) && isSelected && !isCorrect;
                    const isMuted =
                      Boolean(selectedAnswer) && !isSelected && !isCorrect;

                    return (
                      <button
                        key={`${currentQuestion.id}-${option}`}
                        type="button"
                        disabled={Boolean(selectedAnswer)}
                        aria-pressed={isSelected}
                        onClick={() => chooseAnswer(option)}
                        style={{ animationDelay: `${index * 38}ms` }}
                        className={`quiz-answer group relative flex min-h-14 items-start justify-between gap-4 rounded-[20px] border px-4 py-4 text-left text-sm font-bold leading-7 transition sm:text-base ${
                          isCorrect
                            ? "quiz-answer-correct border-emerald-300/44 bg-emerald-300/13 text-emerald-50"
                            : isWrong
                              ? "quiz-answer-wrong border-rose-200/28 bg-rose-300/10 text-white"
                              : isMuted
                                ? "border-white/8 bg-black/10 text-white/36 opacity-60 saturate-50"
                                : "border-white/10 bg-black/16 text-white/76 hover:border-white/24 hover:bg-white/[0.055] disabled:opacity-72"
                        } ${shakingAnswerId === option ? "quiz-answer-shake" : ""}`}
                      >
                        <span className="min-w-0 whitespace-normal break-words">
                          {option}
                        </span>
                        {isCorrect ? (
                          <span className="relative mt-1 shrink-0">
                            <SuccessParticles active={isSelected} />
                            <Check className="quiz-check h-5 w-5" />
                          </span>
                        ) : isWrong ? (
                          <X className="mt-1 h-5 w-5 shrink-0 text-rose-100/78" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                {selectedState ? (
                  <aside
                    className={`quiz-feedback mt-5 rounded-[24px] border p-4 backdrop-blur-2xl sm:p-5 ${
                      selectedState.isCorrect
                        ? "border-emerald-200/24 bg-emerald-300/[0.09] shadow-[0_0_70px_rgba(106,227,192,0.14)]"
                        : "border-[#f28c8c]/24 bg-[#f28c8c]/[0.08] shadow-[0_0_70px_rgba(210,75,99,0.12)]"
                    }`}
                  >
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                      <div className="flex items-start gap-4">
                        <span
                          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                            selectedState.isCorrect
                              ? "bg-[#6ae3c0] text-[#07111f]"
                              : "bg-[#f28c8c] text-[#07111f]"
                          }`}
                        >
                          {selectedState.isCorrect ? (
                            <Check className="h-5 w-5" aria-hidden="true" />
                          ) : (
                            <X className="h-5 w-5" aria-hidden="true" />
                          )}
                        </span>
                        <div>
                          <p
                            className={`text-lg font-black ${
                              selectedState.isCorrect
                                ? "text-emerald-50"
                                : "text-[#ffd7d7]"
                            }`}
                          >
                            {selectedState.label}
                          </p>
                          {!selectedState.isCorrect ? (
                            <p className="mt-2 text-sm font-semibold leading-6 text-white/72">
                              La bonne réponse était :{" "}
                              <span className="font-black text-white">
                                {currentQuestion.correctAnswer}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div>
                        <button
                          type="button"
                          disabled={isPersisting}
                          onClick={() => void goNext()}
                          className={`${premiumPrimaryCtaClassName} quiz-next-button w-full lg:w-auto`}
                        >
                          {currentIndex + 1 === questions.length
                            ? "Voir le résultat"
                            : "Question suivante"}
                        </button>
                        <p className="mt-2 hidden text-center text-xs font-bold text-white/38 md:block">
                          Entrée ou → pour continuer
                        </p>
                      </div>
                    </div>

                    {currentQuestion.factContext ? (
                      <div className="quiz-reminder mt-4 rounded-[18px] border border-white/10 bg-white/[0.045] px-4 py-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f4ead5]/64">
                          À retenir
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-7 text-white/72">
                          {currentQuestion.factContext}
                        </p>
                      </div>
                    ) : null}
                  </aside>
                ) : null}
              </section>
            ) : null}
          </section>
        </div>
      </main>
      <Footer />

      <style jsx>{`
        .quiz-loader {
          animation: quizPulse 1.45s ease-in-out infinite;
        }

        .quiz-question {
          animation: quizEnter 360ms ease-out both;
        }

        .quiz-answer {
          animation: quizAnswerEnter 320ms ease-out both;
        }

        .quiz-feedback {
          animation: quizFeedback 300ms ease-out both;
        }

        .quiz-reminder,
        .quiz-next-button,
        .quiz-review-card {
          animation: quizFeedback 360ms ease-out both;
        }

        .quiz-answer-correct {
          box-shadow:
            0 0 0 1px rgba(106, 227, 192, 0.16),
            0 0 58px rgba(106, 227, 192, 0.26),
            0 0 34px rgba(255, 209, 102, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .quiz-answer-wrong {
          animation: quizShake 360ms cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
          box-shadow:
            0 0 0 1px rgba(251, 113, 133, 0.1),
            0 0 40px rgba(251, 113, 133, 0.16);
        }

        .quiz-check {
          animation: quizCheck 340ms ease-out both;
        }

        .quiz-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .quiz-particle {
          --particle-index: 0;
          --particle-x: 0px;
          --particle-y: -18px;
          position: absolute;
          left: 50%;
          top: 50%;
          height: 5px;
          width: 5px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ffd166, #6ae3c0);
          opacity: 0;
          animation: quizParticle 640ms ease-out both;
          animation-delay: calc(var(--particle-index) * 24ms);
        }

        .quiz-result {
          animation: quizResult 520ms ease-out both;
        }

        .quiz-score {
          animation: quizScore 560ms ease-out both;
        }

        @keyframes quizPulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(255, 209, 102, 0.12);
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 0 0 12px rgba(255, 209, 102, 0);
          }
        }

        @keyframes quizEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes quizAnswerEnter {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes quizFeedback {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes quizCheck {
          from {
            opacity: 0;
            transform: scale(0.72) rotate(-12deg);
          }
          to {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes quizParticle {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          18% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
            transform: translate(
                calc(-50% + var(--particle-x)),
                calc(-50% + var(--particle-y))
              )
              scale(0.1);
          }
        }

        @keyframes quizShake {
          0%,
          100% {
            transform: translateX(0);
          }
          18% {
            transform: translateX(-7px);
          }
          38% {
            transform: translateX(6px);
          }
          58% {
            transform: translateX(-4px);
          }
          78% {
            transform: translateX(3px);
          }
        }

        @keyframes quizResult {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes quizScore {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .quiz-loader,
          .quiz-question,
          .quiz-answer,
          .quiz-feedback,
          .quiz-reminder,
          .quiz-next-button,
          .quiz-review-card,
          .quiz-answer-wrong,
          .quiz-check,
          .quiz-particle,
          .quiz-result,
          .quiz-score {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
