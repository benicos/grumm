import * as Haptics from "expo-haptics";
import {
  Brain,
  CheckCircle2,
  Clock3,
  History,
  RotateCcw,
  Target,
  Trophy,
  XCircle,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "../components/AppScreen";
import { LoadingState } from "../components/ScreenState";
import { ProfileStat } from "../components/ProfileStat";
import { QuizCard } from "../components/QuizCard";
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
    await loadHistory();
  }

  function resetHub() {
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setResult(null);
    setMessage(null);
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
      <AppScreen contentStyle={styles.centered}>
        <View style={styles.resultBadge}>
          <Trophy color={appTheme.color.yellow} size={34} strokeWidth={2.25} />
        </View>
        <Text style={styles.resultScore}>{result.scorePercent}%</Text>
        <Text style={styles.resultTitle}>Session terminée</Text>
        <Text style={styles.resultText}>
          {result.correctAnswers}/{result.totalQuestions} bonnes réponses
        </Text>
        <View style={styles.resultActions}>
          <Pressable onPress={() => void startQuiz("general_quizz")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Recommencer</Text>
          </Pressable>
          <Pressable onPress={resetHub} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Retour quiz</Text>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  if (questions.length > 0) {
    const question = questions[currentIndex];
    const selectedIsCorrect = selectedAnswer === question.correctAnswer;

    return (
      <AppScreen scroll>
        <View style={styles.questionTop}>
          <Text style={styles.kicker}>
            {activeQuizType === "memory_challenge" ? "Défi mémoire" : "Quiz rapide"}
          </Text>
          <Text style={styles.questionCounter}>
            {currentIndex + 1}/{questions.length}
          </Text>
        </View>

        <View style={styles.questionCard}>
          <View style={styles.themePill}>
            <Target color={appTheme.color.violet} size={15} strokeWidth={2.3} />
            <Text numberOfLines={1} style={styles.themePillText}>
              {question.theme}
            </Text>
          </View>
          <Text style={styles.questionText}>{question.prompt}</Text>

          <View style={styles.answerList}>
            {question.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrect = Boolean(selectedAnswer) && option === question.correctAnswer;
              const isWrong = isSelected && !isCorrect;

              return (
                <Pressable
                  disabled={Boolean(selectedAnswer)}
                  key={option}
                  onPress={() => void chooseAnswer(option)}
                  style={[
                    styles.answerButton,
                    isCorrect && styles.answerCorrect,
                    isWrong && styles.answerWrong,
                  ]}
                >
                  <Text style={styles.answerText}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {selectedAnswer ? (
          <View style={selectedIsCorrect ? styles.feedbackGood : styles.feedbackBad}>
            {selectedIsCorrect ? (
              <CheckCircle2 color={appTheme.color.green} size={19} strokeWidth={2.35} />
            ) : (
              <XCircle color={appTheme.color.danger} size={19} strokeWidth={2.35} />
            )}
            <Text style={styles.feedbackText}>
              {selectedIsCorrect
                ? "Bonne réponse."
                : `Presque. La bonne réponse était ${question.correctAnswer}.`}
            </Text>
          </View>
        ) : null}

        {selectedAnswer ? (
          <Pressable onPress={() => void goNext()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Question suivante</Text>
          </Pressable>
        ) : null}
      </AppScreen>
    );
  }

  return (
    <AppScreen contentStyle={styles.hubContent} scroll>
      <View style={styles.header}>
        <Text style={styles.kicker}>Entrainement</Text>
        <Text style={styles.title}>Quiz</Text>
      </View>

      <QuizCard
        Icon={Clock3}
        color={appTheme.color.violet}
        description="5 questions, feedback immédiat."
        meta="Court"
        onPress={() => startQuiz("general_quizz")}
        title="Quiz rapide"
        variant="gradient"
      />

      <QuizCard
        Icon={Brain}
        color={appTheme.color.teal}
        description="Des questions issues de tes lectures quand c'est possible."
        meta="Mémoire"
        onPress={() => startQuiz("memory_challenge")}
        title="Défi mémoire"
      />

      {message ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{message}</Text>
        </View>
      ) : null}

      {session ? (
        <>
          <View style={styles.sectionHeader}>
            <History color={appTheme.color.ink} size={18} strokeWidth={2.25} />
            <Text style={styles.sectionTitle}>Historique</Text>
          </View>
          <View style={styles.statsGrid}>
            <ProfileStat
              Icon={Trophy}
              color={appTheme.color.yellow}
              label="Meilleur score"
              value={quizStats?.bestScore ? `${quizStats.bestScore}%` : "-"}
            />
            <ProfileStat
              Icon={Target}
              color={appTheme.color.violet}
              label="Quiz joues"
              value={quizStats?.sessionsCount ?? 0}
            />
            <ProfileStat
              Icon={RotateCcw}
              color={appTheme.color.teal}
              label="Serie"
              value={summary?.streakCount ?? 0}
            />
          </View>
        </>
      ) : (
        <View style={styles.connectHint}>
          <Text style={styles.connectTitle}>Progression non sauvegardée</Text>
          <Text style={styles.connectText}>
            Connecte-toi depuis le profil pour garder tes scores.
          </Text>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  answerButton: {
    backgroundColor: appTheme.color.card,
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 14,
  },
  answerCorrect: {
    backgroundColor: withAlpha(appTheme.color.green, 0.12),
    borderColor: withAlpha(appTheme.color.green, 0.42),
  },
  answerList: {
    gap: 9,
    marginTop: 18,
  },
  answerText: {
    color: appTheme.color.ink,
    fontSize: 15,
    fontWeight: appTheme.weight.semibold,
    lineHeight: 20,
  },
  answerWrong: {
    backgroundColor: withAlpha(appTheme.color.danger, 0.11),
    borderColor: withAlpha(appTheme.color.danger, 0.38),
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
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
  feedbackBad: {
    alignItems: "center",
    backgroundColor: withAlpha(appTheme.color.danger, 0.1),
    borderColor: withAlpha(appTheme.color.danger, 0.18),
    borderRadius: appTheme.radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 13,
  },
  feedbackGood: {
    alignItems: "center",
    backgroundColor: withAlpha(appTheme.color.green, 0.1),
    borderColor: withAlpha(appTheme.color.green, 0.2),
    borderRadius: appTheme.radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 13,
  },
  feedbackText: {
    color: appTheme.color.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: appTheme.weight.semibold,
    lineHeight: 20,
  },
  header: {
    gap: 3,
    paddingBottom: 8,
    paddingTop: 8,
  },
  hubContent: {
    gap: 18,
  },
  kicker: {
    color: appTheme.color.teal,
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    textTransform: "uppercase",
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
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: appTheme.color.ink,
    borderRadius: appTheme.radius.control,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: appTheme.weight.bold,
  },
  questionCard: {
    backgroundColor: appTheme.color.cardSoft,
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.card,
    borderWidth: 1,
    padding: 16,
    ...appTheme.shadow.card,
  },
  questionCounter: {
    color: appTheme.color.ink,
    fontSize: 18,
    fontWeight: appTheme.weight.bold,
  },
  questionText: {
    color: appTheme.color.ink,
    fontSize: 22,
    fontWeight: appTheme.weight.bold,
    lineHeight: 28,
    marginTop: 16,
  },
  questionTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  resultActions: {
    gap: 10,
    marginTop: 22,
    width: "100%",
  },
  resultBadge: {
    alignItems: "center",
    backgroundColor: withAlpha(appTheme.color.yellow, 0.18),
    borderRadius: appTheme.radius.pill,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  resultScore: {
    color: appTheme.color.ink,
    fontSize: 56,
    fontWeight: appTheme.weight.bold,
    lineHeight: 62,
    marginTop: 18,
  },
  resultText: {
    color: appTheme.color.muted,
    fontSize: 15,
    fontWeight: appTheme.weight.medium,
    marginTop: 6,
  },
  resultTitle: {
    color: appTheme.color.ink,
    fontSize: 22,
    fontWeight: appTheme.weight.bold,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: appTheme.color.card,
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  secondaryButtonText: {
    color: appTheme.color.ink,
    fontSize: 15,
    fontWeight: appTheme.weight.semibold,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  sectionTitle: {
    color: appTheme.color.ink,
    fontSize: 17,
    fontWeight: appTheme.weight.bold,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themePill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: withAlpha(appTheme.color.violet, 0.11),
    borderRadius: appTheme.radius.pill,
    flexDirection: "row",
    gap: 7,
    maxWidth: "80%",
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
    fontSize: 24,
    fontWeight: appTheme.weight.bold,
    lineHeight: 29,
  },
});
