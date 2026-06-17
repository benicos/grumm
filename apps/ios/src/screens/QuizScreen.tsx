import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Flame,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "../components/AppScreen";
import { LoadingState } from "../components/ScreenState";
import { useAuth } from "../context/AuthContext";
import { getProfileSummary, getQuizStatsSummary } from "../lib/facts";
import {
  getMemoryChallengeQuestions,
  getQuickQuizQuestions,
  getQuizResult,
  saveQuizResult,
  saveQuickQuizResult,
  type MobileQuizAnswer,
  type MobileQuizQuestion,
  type MobileQuizResult,
  type MobileQuizType,
} from "../lib/quiz";
import { appTheme, withAlpha } from "../theme/appTheme";
import type { ProfileSummary, QuizStatsSummary } from "../types/domain";

type QuizMode = {
  Icon: LucideIcon;
  accent: string;
  body: string;
  cta: string;
  detail: string;
  gradient: [string, string, string];
  kicker: string;
  title: string;
  type: MobileQuizType;
};

const quizModes: QuizMode[] = [
  {
    Icon: Zap,
    accent: "#ffb156",
    body: "5 questions pour tester ta culture.",
    cta: "Lancer",
    detail: "Feedback immédiat",
    gradient: ["#7c5cff", "#ff7a59", "#f2c94c"],
    kicker: "Mode rapide",
    title: "Quiz général",
    type: "general_quizz",
  },
  {
    Icon: Brain,
    accent: "#6ae3c0",
    body: "Des questions issues de tes lectures quand c'est possible.",
    cta: "Réviser",
    detail: "Mémoire ciblée",
    gradient: ["#173044", "#1ea7a1", "#47b881"],
    kicker: "Mode personnel",
    title: "Défi mémoire",
    type: "memory_challenge",
  },
];

function getMode(type: MobileQuizType) {
  return quizModes.find((mode) => mode.type === type) ?? quizModes[0];
}

export function QuizScreen() {
  const { isLoading: isAuthLoading, session } = useAuth();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [quizStats, setQuizStats] = useState<QuizStatsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<MobileQuizQuestion[]>([]);
  const [answers, setAnswers] = useState<MobileQuizAnswer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [activeQuizType, setActiveQuizType] = useState<MobileQuizType>("general_quizz");
  const [result, setResult] = useState<MobileQuizResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!session) {
      setSummary(null);
      setQuizStats(null);
      return;
    }

    const [nextSummary, nextQuizStats] = await Promise.all([
      getProfileSummary().catch(() => null),
      getQuizStatsSummary().catch(() => null),
    ]);
    setSummary(nextSummary);
    setQuizStats(nextQuizStats);
  }, [session]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadHistory();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadHistory]);

  async function startQuiz(type: MobileQuizType) {
    await Haptics.selectionAsync();
    setIsLoading(true);
    setMessage(null);
    setSessionNotice(
      type === "memory_challenge" && (!session || (summary?.uniqueViewsCount ?? 0) < 3)
        ? "On te préparera un défi mémoire plus personnel dès que tu auras lu quelques faits. En attendant, voici un entraînement général."
        : null,
    );
    setResult(null);
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setActiveQuizType(type);

    try {
      const nextQuestions =
        type === "memory_challenge"
          ? await getMemoryChallengeQuestions()
          : await getQuickQuizQuestions();
      setQuestions(nextQuestions);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Quiz indisponible.");
    } finally {
      setIsLoading(false);
    }
  }

  async function chooseAnswer(answer: string) {
    const question = questions[currentIndex];

    if (!question || selectedAnswer) {
      return;
    }

    const nextAnswer: MobileQuizAnswer = {
      correctAnswer: question.correctAnswer,
      factId: question.factId,
      isCorrect: answer === question.correctAnswer,
      questionId: question.id,
      selectedAnswer: answer,
    };

    setSelectedAnswer(answer);
    setAnswers((current) => [...current, nextAnswer]);
    await Haptics.notificationAsync(
      nextAnswer.isCorrect
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );
  }

  async function goNext() {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((index) => index + 1);
      setSelectedAnswer(null);
      return;
    }

    const finalAnswers = answers;
    const nextResult = session
      ? activeQuizType === "general_quizz"
        ? await saveQuickQuizResult(finalAnswers)
        : await saveQuizResult(finalAnswers, activeQuizType)
      : getQuizResult(finalAnswers);

    setResult(nextResult ?? getQuizResult(finalAnswers));
    setQuestions([]);
    setSelectedAnswer(null);
    setSessionNotice(null);
    await loadHistory();
  }

  function resetHub() {
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setResult(null);
    setMessage(null);
    setSessionNotice(null);
  }

  if (isAuthLoading) {
    return (
      <AppScreen>
        <LoadingState label="Ouverture du quiz..." />
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen>
        <LoadingState label="Préparation des questions..." />
      </AppScreen>
    );
  }

  if (result) {
    return (
      <ResultView
        activeQuizType={activeQuizType}
        onBack={resetHub}
        onStartQuiz={startQuiz}
        result={result}
      />
    );
  }

  if (questions.length > 0) {
    return (
      <QuestionView
        activeQuizType={activeQuizType}
        currentIndex={currentIndex}
        onChooseAnswer={chooseAnswer}
        onNext={goNext}
        question={questions[currentIndex]}
        selectedAnswer={selectedAnswer}
        sessionNotice={sessionNotice}
        totalQuestions={questions.length}
      />
    );
  }

  return (
    <AppScreen contentStyle={styles.hubContent} scroll>
      <View style={styles.hero}>
        <LinearGradient
          colors={["rgba(124,92,255,0.16)", "rgba(30,167,161,0.10)", "rgba(255,255,255,0.34)"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Brain color={appTheme.color.teal} size={24} strokeWidth={2.35} />
            </View>
            <Text style={styles.kicker}>Entraînement</Text>
          </View>
          <Text style={styles.title}>Quiz</Text>
          <Text style={styles.subtitle}>Teste ce que tu sais. Renforce ce que tu as découvert.</Text>
        </LinearGradient>
      </View>

      <View style={styles.modeStack}>
        {quizModes.map((mode) => (
          <ModeCard key={mode.type} mode={mode} onPress={() => void startQuiz(mode.type)} />
        ))}
      </View>

      {message ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{message}</Text>
        </View>
      ) : null}

      {session ? (
        <TrainingStats quizStats={quizStats} summary={summary} />
      ) : (
        <View style={styles.connectHint}>
          <Text style={styles.connectTitle}>Progression non sauvegardée</Text>
          <Text style={styles.connectText}>Connecte-toi depuis le profil pour garder tes scores.</Text>
        </View>
      )}
    </AppScreen>
  );
}

function ModeCard({ mode, onPress }: { mode: QuizMode; onPress: () => void }) {
  const Icon = mode.Icon;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.modePressable, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={mode.gradient}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.modeCard}
      >
        <View style={styles.modeTop}>
          <View style={styles.modeIcon}>
            <Icon color={mode.accent} size={24} strokeWidth={2.35} />
          </View>
          <Text style={styles.modeKicker}>{mode.kicker}</Text>
        </View>
        <View style={styles.modeCopy}>
          <Text style={styles.modeTitle}>{mode.title}</Text>
          <Text style={styles.modeBody}>{mode.body}</Text>
        </View>
        <View style={styles.modeBottom}>
          <Text style={styles.modeDetail}>{mode.detail}</Text>
          <View style={styles.playButton}>
            <Play color={appTheme.color.ink} fill={appTheme.color.ink} size={15} strokeWidth={2.4} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function QuestionView({
  activeQuizType,
  currentIndex,
  onChooseAnswer,
  onNext,
  question,
  selectedAnswer,
  sessionNotice,
  totalQuestions,
}: {
  activeQuizType: MobileQuizType;
  currentIndex: number;
  onChooseAnswer: (answer: string) => Promise<void>;
  onNext: () => Promise<void>;
  question: MobileQuizQuestion;
  selectedAnswer: string | null;
  sessionNotice: string | null;
  totalQuestions: number;
}) {
  const mode = getMode(activeQuizType);
  const selectedIsCorrect = selectedAnswer === question.correctAnswer;
  const progress = (currentIndex + 1) / Math.max(totalQuestions, 1);

  return (
    <AppScreen contentStyle={styles.questionContent} scroll>
      <View style={styles.questionHeader}>
        <View>
          <Text style={[styles.kicker, { color: mode.accent }]}>{mode.title}</Text>
          <Text style={styles.questionCounter}>Question {currentIndex + 1}/{totalQuestions}</Text>
        </View>
        <View style={[styles.questionBadge, { backgroundColor: withAlpha(mode.accent, 0.14) }]}>
          <Target color={mode.accent} size={18} strokeWidth={2.35} />
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { backgroundColor: mode.accent, width: `${progress * 100}%` }]} />
      </View>

      {sessionNotice ? (
        <View style={styles.softNotice}>
          <Text style={styles.softNoticeText}>{sessionNotice}</Text>
        </View>
      ) : null}

      <LinearGradient
        colors={[withAlpha(mode.accent, 0.13), "rgba(255,255,255,0.74)"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.questionCard}
      >
        <View style={styles.themePill}>
          <Sparkles color={mode.accent} size={14} strokeWidth={2.35} />
          <Text numberOfLines={1} style={styles.themePillText}>{question.theme}</Text>
        </View>
        <Text style={styles.questionText}>{question.prompt}</Text>
      </LinearGradient>

      <View style={styles.answerList}>
        {question.options.map((option) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = Boolean(selectedAnswer) && option === question.correctAnswer;
          const isWrong = isSelected && !isCorrect;

          return (
            <Pressable
              accessibilityRole="button"
              disabled={Boolean(selectedAnswer)}
              key={option}
              onPress={() => void onChooseAnswer(option)}
              style={({ pressed }) => [
                styles.answerButton,
                isCorrect && styles.answerCorrect,
                isWrong && styles.answerWrong,
                selectedAnswer && !isCorrect && !isWrong ? styles.answerMuted : null,
                pressed && !selectedAnswer ? styles.answerPressed : null,
              ]}
            >
              <Text style={[styles.answerText, isCorrect && styles.answerTextStrong]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>

      {selectedAnswer ? (
        <FeedbackCard
          correctAnswer={question.correctAnswer}
          isCorrect={selectedIsCorrect}
          theme={question.theme}
        />
      ) : null}

      {selectedAnswer ? (
        <Pressable onPress={() => void onNext()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>
            {currentIndex + 1 < totalQuestions ? "Question suivante" : "Voir le résultat"}
          </Text>
          <ArrowRight color="#ffffff" size={17} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </AppScreen>
  );
}

function FeedbackCard({
  correctAnswer,
  isCorrect,
  theme,
}: {
  correctAnswer: string;
  isCorrect: boolean;
  theme: string;
}) {
  const Icon = isCorrect ? CheckCircle2 : XCircle;
  const color = isCorrect ? appTheme.color.green : appTheme.color.danger;

  return (
    <View
      style={[
        styles.feedbackCard,
        {
          backgroundColor: withAlpha(color, 0.11),
          borderColor: withAlpha(color, 0.24),
        },
      ]}
    >
      <View style={[styles.feedbackIcon, { backgroundColor: withAlpha(color, 0.14) }]}>
        <Icon color={color} size={21} strokeWidth={2.45} />
      </View>
      <View style={styles.feedbackCopy}>
        <Text style={styles.feedbackTitle}>
          {isCorrect ? "Bonne réponse." : "Pas tout à fait."}
        </Text>
        <Text style={styles.feedbackText}>
          {isCorrect
            ? `Tu as bien retenu ce repère ${theme.toLowerCase()}.`
            : `La bonne réponse était : ${correctAnswer}.`}
        </Text>
      </View>
    </View>
  );
}

function ResultView({
  activeQuizType,
  onBack,
  onStartQuiz,
  result,
}: {
  activeQuizType: MobileQuizType;
  onBack: () => void;
  onStartQuiz: (type: MobileQuizType) => Promise<void>;
  result: MobileQuizResult;
}) {
  const mode = getMode(activeQuizType);
  const alternateType: MobileQuizType =
    activeQuizType === "general_quizz" ? "memory_challenge" : "general_quizz";
  const alternateMode = getMode(alternateType);

  return (
    <AppScreen contentStyle={styles.resultContent} scroll>
      <LinearGradient
        colors={[withAlpha(mode.accent, 0.18), "rgba(255,255,255,0.72)"]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.resultCard}
      >
        <View style={[styles.resultBadge, { backgroundColor: withAlpha(mode.accent, 0.16) }]}>
          <Trophy color={mode.accent} size={34} strokeWidth={2.25} />
        </View>
        <Text style={styles.resultScore}>{result.correctAnswers}/{result.totalQuestions}</Text>
        <Text style={styles.resultTitle}>{getResultTitle(result)}</Text>
        <Text style={styles.resultText}>{result.scorePercent}% de réussite</Text>
      </LinearGradient>

      <View style={styles.resultActions}>
        <Pressable onPress={() => void onStartQuiz(activeQuizType)} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Recommencer</Text>
          <RotateCcw color="#ffffff" size={17} strokeWidth={2.5} />
        </Pressable>
        <Pressable onPress={() => void onStartQuiz(alternateType)} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{alternateMode.title}</Text>
        </Pressable>
        <Pressable onPress={onBack} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Retour au quiz</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function TrainingStats({
  quizStats,
  summary,
}: {
  quizStats: QuizStatsSummary | null;
  summary: ProfileSummary | null;
}) {
  const stats = useMemo(
    () => [
      {
        Icon: Trophy,
        color: appTheme.color.yellow,
        label: "Meilleur score",
        value: typeof quizStats?.bestScore === "number" ? `${quizStats.bestScore}%` : "-",
      },
      {
        Icon: BarChart3,
        color: appTheme.color.violet,
        label: "Quiz joués",
        value: quizStats?.sessionsCount ?? 0,
      },
      {
        Icon: Flame,
        color: appTheme.color.teal,
        label: "Série",
        value: summary?.streakCount ?? 0,
      },
    ],
    [quizStats, summary],
  );

  return (
    <View style={styles.trainingSection}>
      <Text style={styles.sectionTitle}>Ton entraînement</Text>
      <View style={styles.trainingStats}>
        {stats.map(({ Icon, color, label, value }) => (
          <View key={label} style={styles.statPill}>
            <Icon color={color} size={16} strokeWidth={2.35} />
            <Text style={styles.statValue}>{value}</Text>
            <Text numberOfLines={1} style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function getResultTitle(result: MobileQuizResult) {
  if (result.scorePercent >= 100) {
    return "Mémoire affûtée.";
  }

  if (result.scorePercent >= 60) {
    return "Bonne base, continue.";
  }

  return "Rien de grave, c'est comme ça qu'on apprend.";
}

const styles = StyleSheet.create({
  answerButton: {
    backgroundColor: appTheme.color.card,
    borderColor: appTheme.color.border,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  answerCorrect: {
    backgroundColor: withAlpha(appTheme.color.green, 0.13),
    borderColor: withAlpha(appTheme.color.green, 0.48),
  },
  answerList: {
    gap: 10,
  },
  answerMuted: {
    opacity: 0.58,
  },
  answerPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  answerText: {
    color: appTheme.color.ink,
    fontSize: 15,
    fontWeight: appTheme.weight.semibold,
    lineHeight: 21,
  },
  answerTextStrong: {
    fontWeight: appTheme.weight.bold,
  },
  answerWrong: {
    backgroundColor: withAlpha(appTheme.color.danger, 0.11),
    borderColor: withAlpha(appTheme.color.danger, 0.42),
  },
  connectHint: {
    backgroundColor: withAlpha(appTheme.color.teal, 0.09),
    borderColor: withAlpha(appTheme.color.teal, 0.2),
    borderRadius: appTheme.radius.card,
    borderWidth: 1,
    padding: 16,
  },
  connectText: {
    color: appTheme.color.muted,
    fontSize: 14,
    fontWeight: appTheme.weight.medium,
    lineHeight: 20,
    marginTop: 4,
  },
  connectTitle: {
    color: appTheme.color.ink,
    fontSize: 16,
    fontWeight: appTheme.weight.bold,
  },
  feedbackCard: {
    alignItems: "flex-start",
    borderRadius: appTheme.radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  feedbackCopy: {
    flex: 1,
    gap: 4,
  },
  feedbackIcon: {
    alignItems: "center",
    borderRadius: appTheme.radius.pill,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  feedbackText: {
    color: appTheme.color.muted,
    fontSize: 14,
    fontWeight: appTheme.weight.medium,
    lineHeight: 20,
  },
  feedbackTitle: {
    color: appTheme.color.ink,
    fontSize: 16,
    fontWeight: appTheme.weight.bold,
  },
  ghostButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  ghostButtonText: {
    color: appTheme.color.muted,
    fontSize: 14,
    fontWeight: appTheme.weight.bold,
  },
  hero: {
    borderRadius: 26,
    overflow: "hidden",
  },
  heroGradient: {
    borderColor: "rgba(255,255,255,0.68)",
    borderRadius: 26,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 18,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  hubContent: {
    gap: 17,
    paddingTop: 8,
  },
  kicker: {
    color: appTheme.color.teal,
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  modeBody: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    fontWeight: appTheme.weight.medium,
    lineHeight: 21,
  },
  modeBottom: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modeCard: {
    borderRadius: 24,
    gap: 16,
    minHeight: 166,
    overflow: "hidden",
    padding: 17,
    ...appTheme.shadow.card,
  },
  modeCopy: {
    gap: 6,
  },
  modeDetail: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    textTransform: "uppercase",
  },
  modeIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  modeKicker: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    textTransform: "uppercase",
  },
  modePressable: {
    borderRadius: 24,
  },
  modeStack: {
    gap: 12,
  },
  modeTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: appTheme.weight.bold,
    lineHeight: 29,
  },
  modeTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  notice: {
    backgroundColor: withAlpha(appTheme.color.yellow, 0.16),
    borderColor: withAlpha(appTheme.color.yellow, 0.28),
    borderRadius: appTheme.radius.control,
    borderWidth: 1,
    padding: 13,
  },
  noticeText: {
    color: appTheme.color.ink,
    fontSize: 14,
    fontWeight: appTheme.weight.semibold,
    lineHeight: 20,
  },
  playButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: appTheme.radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.988 }],
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: appTheme.color.ink,
    borderRadius: appTheme.radius.control,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: appTheme.weight.bold,
  },
  progressFill: {
    borderRadius: appTheme.radius.pill,
    height: "100%",
  },
  progressTrack: {
    backgroundColor: withAlpha(appTheme.color.ink, 0.08),
    borderRadius: appTheme.radius.pill,
    height: 7,
    overflow: "hidden",
  },
  questionBadge: {
    alignItems: "center",
    borderRadius: appTheme.radius.pill,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  questionCard: {
    borderColor: "rgba(255,255,255,0.68)",
    borderRadius: 26,
    borderWidth: 1,
    gap: 15,
    padding: 17,
  },
  questionContent: {
    gap: 15,
    paddingTop: 8,
  },
  questionCounter: {
    color: appTheme.color.ink,
    fontSize: 18,
    fontWeight: appTheme.weight.bold,
    marginTop: 3,
  },
  questionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  questionText: {
    color: appTheme.color.ink,
    fontSize: 22,
    fontWeight: appTheme.weight.bold,
    lineHeight: 29,
  },
  resultActions: {
    gap: 10,
  },
  resultBadge: {
    alignItems: "center",
    borderRadius: appTheme.radius.pill,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  resultCard: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.68)",
    borderRadius: 28,
    borderWidth: 1,
    gap: 8,
    padding: 24,
  },
  resultContent: {
    gap: 18,
    justifyContent: "center",
    paddingTop: 18,
  },
  resultScore: {
    color: appTheme.color.ink,
    fontSize: 50,
    fontWeight: appTheme.weight.bold,
    lineHeight: 56,
    marginTop: 6,
  },
  resultText: {
    color: appTheme.color.muted,
    fontSize: 15,
    fontWeight: appTheme.weight.medium,
  },
  resultTitle: {
    color: appTheme.color.ink,
    fontSize: 21,
    fontWeight: appTheme.weight.bold,
    lineHeight: 27,
    textAlign: "center",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: appTheme.color.card,
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryButtonText: {
    color: appTheme.color.ink,
    fontSize: 15,
    fontWeight: appTheme.weight.semibold,
  },
  sectionTitle: {
    color: appTheme.color.ink,
    fontSize: 17,
    fontWeight: appTheme.weight.bold,
  },
  softNotice: {
    backgroundColor: withAlpha(appTheme.color.teal, 0.09),
    borderColor: withAlpha(appTheme.color.teal, 0.18),
    borderRadius: appTheme.radius.control,
    borderWidth: 1,
    padding: 12,
  },
  softNoticeText: {
    color: appTheme.color.ink,
    fontSize: 13,
    fontWeight: appTheme.weight.medium,
    lineHeight: 19,
  },
  statLabel: {
    color: appTheme.color.muted,
    fontSize: 10.5,
    fontWeight: appTheme.weight.semibold,
  },
  statPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: appTheme.color.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    minHeight: 82,
    minWidth: 0,
    padding: 10,
  },
  statValue: {
    color: appTheme.color.ink,
    fontSize: 18,
    fontWeight: appTheme.weight.bold,
  },
  subtitle: {
    color: appTheme.color.muted,
    fontSize: 14,
    fontWeight: appTheme.weight.medium,
    lineHeight: 21,
  },
  themePill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.58)",
    borderRadius: appTheme.radius.pill,
    flexDirection: "row",
    gap: 7,
    maxWidth: "86%",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  themePillText: {
    color: appTheme.color.ink,
    fontSize: 12,
    fontWeight: appTheme.weight.semibold,
  },
  title: {
    color: appTheme.color.ink,
    fontSize: 30,
    fontWeight: appTheme.weight.bold,
    lineHeight: 36,
  },
  trainingSection: {
    gap: 10,
    paddingTop: 2,
  },
  trainingStats: {
    flexDirection: "row",
    gap: 9,
  },
});
