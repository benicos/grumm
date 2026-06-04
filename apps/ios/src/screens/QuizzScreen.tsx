import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Brain, Bolt, ChevronRight, Flame, Play, RotateCcw, Target, Trophy, type LucideIcon } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LoadingState } from "../components/ScreenState";
import { useAuth } from "../context/AuthContext";
import { getProfileSummary, getQuizStatsSummary } from "../lib/facts";
import {
  getQuickQuizQuestions,
  getMemoryChallengeQuestions,
  getMistakeReviewQuestions,
  getQuizResult,
  saveQuizResult,
  saveQuickQuizResult,
  type MobileQuizAnswer,
  type MobileQuizQuestion,
  type MobileQuizResult,
  type MobileQuizType,
} from "../lib/quizz";
import { colors } from "../theme/colors";
import { designTokens as ds } from "../theme/designTokens";
import type { ProfileSummary, QuizStatsSummary } from "../types/domain";
import { AuthScreen } from "./AuthScreen";

export function QuizzScreen({
  memoryStartSignal = 0,
  onMemoryStartHandled,
}: {
  memoryStartSignal?: number;
  onMemoryStartHandled?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { isLoading: isAuthLoading, session } = useAuth();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [quizStats, setQuizStats] = useState<QuizStatsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<MobileQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<MobileQuizAnswer[]>([]);
  const [activeQuizType, setActiveQuizType] = useState<MobileQuizType>("general_quizz");
  const [result, setResult] = useState<MobileQuizResult | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [modeHint, setModeHint] = useState<string | null>(null);

  const loadHub = useCallback(async () => {
    if (!session) {
      return;
    }

    setIsLoading(true);
    const [nextSummary, nextQuizStats] = await Promise.all([
      getProfileSummary().catch(() => null),
      getQuizStatsSummary().catch(() => null),
    ]);
    setSummary(nextSummary);
    setQuizStats(nextQuizStats);
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadHub();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadHub]);

  useEffect(() => {
    if (!session || memoryStartSignal === 0) {
      return;
    }

    void selectMemoryMode();
    onMemoryStartHandled?.();
  }, [memoryStartSignal, onMemoryStartHandled, session]);

  async function selectMemoryMode() {
    await Haptics.selectionAsync();
    setModeHint(null);
    setResult(null);
    setSelectedAnswer(null);
    setAnswers([]);
    setCurrentIndex(0);
    setActiveQuizType("memory_challenge");
    setIsLoading(true);
    try {
      setQuestions(await getMemoryChallengeQuestions());
    } catch (error) {
      setModeHint(error instanceof Error ? error.message : "Défi indisponible.");
    } finally {
      setIsLoading(false);
    }
  }

  async function startQuickQuiz() {
    await Haptics.selectionAsync();
    setModeHint(null);
    setResult(null);
    setSelectedAnswer(null);
    setAnswers([]);
    setCurrentIndex(0);
    setActiveQuizType("general_quizz");
    setIsLoading(true);
    try {
      setQuestions(await getQuickQuizQuestions());
    } catch (error) {
      setModeHint(error instanceof Error ? error.message : "Quiz indisponible.");
    } finally {
      setIsLoading(false);
    }
  }

  async function startMistakeReview() {
    await Haptics.selectionAsync();
    setModeHint(null);
    setResult(null);
    setSelectedAnswer(null);
    setAnswers([]);
    setCurrentIndex(0);
    setActiveQuizType("general_quizz");
    setIsLoading(true);
    try {
      const mistakeQuestions = await getMistakeReviewQuestions();
      if (mistakeQuestions.length === 0) {
        setModeHint("Aucune erreur à revoir pour le moment.");
        return;
      }
      setQuestions(mistakeQuestions);
    } catch (error) {
      setModeHint(error instanceof Error ? error.message : "Révision indisponible.");
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

    const nextResult = activeQuizType === "general_quizz"
      ? await saveQuickQuizResult(answers)
      : await saveQuizResult(answers, activeQuizType);
    setQuestions([]);
    setSelectedAnswer(null);
    setResult(nextResult ?? getQuizResult(answers));
    setModeHint(null);
    await loadHub();
  }

  function resetQuizHub() {
    setAnswers([]);
    setCurrentIndex(0);
    setModeHint(null);
    setQuestions([]);
    setResult(null);
    setSelectedAnswer(null);
  }

  if (isAuthLoading) {
    return <LoadingState label="Ouverture du Quizz..." />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  const bestScore = quizStats?.bestScore ?? null;
  const sessionsCount = quizStats?.sessionsCount ?? 0;
  const streak = summary?.streakCount ?? 0;

  if (result) {
    return (
      <LinearGradient colors={ds.gradient.app} style={styles.root}>
        <View style={[styles.content, styles.resultContent, { paddingTop: insets.top + ds.space.md }]}>
          <View style={styles.resultBadge}>
            <Trophy color={ds.color.goal} size={ds.icon.lg} strokeWidth={2.3} />
          </View>
          <Text style={styles.resultScore}>{result.scorePercent}%</Text>
          <Text style={styles.resultTitle}>Session terminée</Text>
          <Text style={styles.resultText}>
            {result.correctAnswers}/{result.totalQuestions} bonnes réponses · série max {result.bestStreak}
          </Text>
          <View style={styles.resultActions}>
            <Pressable onPress={() => void startQuickQuiz()} style={styles.resultPrimary}>
              <Text style={styles.resultPrimaryText}>Recommencer</Text>
            </Pressable>
            <Pressable onPress={resetQuizHub} style={styles.resultSecondary}>
              <Text style={styles.resultSecondaryText}>Retour Quizz</Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    );
  }

  if (questions.length > 0) {
    const question = questions[currentIndex];
    const selectedIsCorrect = selectedAnswer === question.correctAnswer;

    return (
      <LinearGradient colors={ds.gradient.app} style={styles.root}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + ds.space.md }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.kicker}>Quiz rapide</Text>
          <View style={styles.questionHeader}>
            <Text style={styles.questionCounter}>
              {currentIndex + 1}/{questions.length}
            </Text>
            <View style={styles.questionPill}>
              <Target color={ds.color.goal} size={ds.icon.sm} strokeWidth={2.3} />
              <Text style={styles.questionPillText}>{question.theme}</Text>
            </View>
          </View>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{question.prompt}</Text>
            <View style={styles.answerList}>
              {question.options.map((option) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = selectedAnswer && option === question.correctAnswer;
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
            <Pressable onPress={() => void goNext()} style={styles.nextButton}>
              <Text style={styles.nextButtonText}>
                {selectedIsCorrect ? "Continuer" : `Réponse : ${question.correctAnswer}`}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={ds.gradient.app} style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + ds.space.md }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSimple}>
          <Text style={styles.screenTitle}>Quizz</Text>
          <View style={styles.streakPill}>
            <Text style={styles.streakText}>🔥 {streak}</Text>
          </View>
        </View>

        {isLoading ? <LoadingState label="Lecture des scores..." /> : null}

        <Pressable
          onPress={() => void selectMemoryMode()}
          style={({ pressed }) => [styles.memoryCard, pressed && styles.pressed]}
        >
          <LinearGradient colors={ds.gradient.memory} style={styles.memoryGradient}>
            <View style={styles.badge}>
              <Flame color={ds.color.orange} size={ds.icon.sm} strokeWidth={2.35} />
              <Text style={styles.badgeText}>Défi du jour</Text>
            </View>
            <View style={styles.memoryBody}>
              <View style={styles.brainIllustration}>
                <View style={styles.brainOrbit} />
                <Brain color={ds.color.text} size={42} strokeWidth={2.1} />
              </View>
              <View style={styles.memoryCopy}>
                <Text style={styles.modeTitle}>Relève le défi mémoire du jour</Text>
                <Text style={styles.modeMeta}>10 questions · Mélangé</Text>
              </View>
            </View>
            <View style={styles.memoryCta}>
              <Text style={styles.memoryCtaText}>Commencer</Text>
              <Play color="#06111d" fill="#06111d" size={16} strokeWidth={2.4} />
            </View>
          </LinearGradient>
        </Pressable>

        <View style={styles.sectionIntro}>
          <Text style={styles.sectionTitle}>Quiz rapide</Text>
          <Text style={styles.sectionSubtitle}>5 questions · Top chrono</Text>
        </View>
        <Pressable
          onPress={() => void startQuickQuiz()}
          style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
        >
          <View style={[styles.actionIcon, { backgroundColor: ds.color.action }]}>
            <Bolt color="#06111d" size={ds.icon.md} strokeWidth={2.35} />
          </View>
          <View style={styles.quickCopy}>
            <Text style={styles.quickTitle}>Prêt pour un défi rapide ?</Text>
            <Text style={styles.quickMeta}>Réponds sans casser le rythme.</Text>
          </View>
          <View style={styles.quickPlay}>
            <Play color="#06111d" fill="#06111d" size={15} strokeWidth={2.4} />
          </View>
        </Pressable>

        <View style={styles.sectionIntro}>
          <Text style={styles.sectionTitle}>Ton historique</Text>
          <Text style={styles.sectionLink}>Voir tout</Text>
        </View>
        <View style={styles.statsRow}>
          <StatCard Icon={Trophy} color={ds.color.goal} label="Meilleur score" value={bestScore ? `${bestScore}%` : "—"} />
          <StatCard Icon={Flame} color={ds.color.orange} label="Meilleure série" value={streak} />
          <StatCard Icon={Target} color={ds.color.progress} label="Quiz complétés" value={sessionsCount} />
        </View>

        <View style={styles.sectionIntro}>
          <Text style={styles.sectionTitle}>Revoir tes erreurs</Text>
        </View>
        <View style={styles.primaryGrid}>
          <ActionCard
            Icon={RotateCcw}
            color={ds.color.discovery}
            cta="Revoir"
            label="Tes erreurs"
            meta="Questions à revoir"
            onPress={startMistakeReview}
          />
        </View>

        {modeHint ? (
          <View style={styles.toast}>
            <Trophy color={ds.color.goal} size={17} strokeWidth={2.3} />
            <Text style={styles.toastText}>{modeHint}</Text>
          </View>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

function ActionCard({
  Icon,
  color,
  cta,
  label,
  meta,
  onPress,
}: {
  Icon: LucideIcon;
  color: string;
  cta: string;
  label: string;
  meta: string;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable onPress={() => void onPress()} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Icon color="#06111d" size={ds.icon.md} strokeWidth={2.35} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionMeta}>{meta}</Text>
      <View style={styles.actionCta}>
        <Text style={styles.actionCtaText}>{cta}</Text>
        <ChevronRight color={ds.color.text} size={15} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

function StatCard({ Icon, color, label, value }: { Icon: LucideIcon; color: string; label: string; value: number | string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Icon color="#06111d" size={16} strokeWidth={2.45} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.card,
    borderWidth: 1,
    flex: 1,
    minHeight: 132,
    padding: ds.space.md,
  },
  actionCta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 3,
    marginTop: "auto",
  },
  actionCtaText: {
    color: ds.color.text,
    fontSize: ds.typography.caption,
    fontWeight: ds.weight.semibold,
  },
  actionIcon: {
    alignItems: "center",
    borderRadius: 17,
    height: 42,
    justifyContent: "center",
    marginBottom: 12,
    width: 42,
  },
  actionLabel: {
    color: ds.color.text,
    fontSize: 17,
    fontWeight: ds.weight.bold,
  },
  actionMeta: {
    color: ds.color.muted,
    fontSize: ds.typography.caption,
    fontWeight: ds.weight.medium,
    marginTop: 4,
  },
  answerButton: {
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 15,
  },
  answerCorrect: {
    backgroundColor: "rgba(106,227,192,0.16)",
    borderColor: "rgba(106,227,192,0.44)",
  },
  answerList: {
    gap: 9,
    marginTop: 18,
  },
  answerText: {
    color: ds.color.text,
    fontSize: ds.typography.body,
    fontWeight: ds.weight.semibold,
    lineHeight: 20,
  },
  answerWrong: {
    backgroundColor: "rgba(255,122,144,0.13)",
    borderColor: "rgba(255,122,144,0.34)",
  },
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(5,8,18,0.36)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: ds.radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeText: {
    color: ds.color.text,
    fontSize: ds.typography.small,
    fontWeight: ds.weight.semibold,
    textTransform: "uppercase",
  },
  brainIllustration: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.13)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 30,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    overflow: "hidden",
    width: 72,
  },
  brainOrbit: {
    backgroundColor: "rgba(106,227,192,0.26)",
    borderRadius: ds.radius.full,
    height: 84,
    position: "absolute",
    right: -32,
    top: -30,
    width: 84,
  },
  content: {
    gap: ds.space.sm,
    paddingBottom: 30,
    paddingHorizontal: ds.space.gutter,
  },
  headerSimple: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
  },
  glowCyan: {
    backgroundColor: "rgba(106,227,192,0.13)",
    borderRadius: ds.radius.full,
    bottom: -120,
    height: 260,
    left: -120,
    position: "absolute",
    width: 260,
  },
  glowViolet: {
    backgroundColor: "rgba(167,139,250,0.18)",
    borderRadius: ds.radius.full,
    height: 260,
    position: "absolute",
    right: -120,
    top: -90,
    width: 260,
  },
  hero: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 88,
  },
  heroCopy: {
    flex: 1,
  },
  heroProgress: {
    alignItems: "center",
    backgroundColor: "rgba(167,139,250,0.18)",
    borderColor: "rgba(167,139,250,0.32)",
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 62,
    minWidth: 76,
  },
  heroProgressLabel: {
    color: ds.color.muted,
    fontSize: 10,
    fontWeight: ds.weight.medium,
    marginTop: 2,
  },
  heroProgressValue: {
    color: ds.color.text,
    fontSize: 20,
    fontWeight: ds.weight.bold,
  },
  historyPanel: {
    gap: 10,
    paddingTop: 2,
  },
  kicker: {
    color: ds.color.action,
    fontSize: ds.typography.small,
    fontWeight: ds.weight.bold,
    textTransform: "uppercase",
  },
  memoryBody: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    marginTop: 18,
  },
  memoryCard: {
    borderRadius: ds.radius.hero,
    overflow: "hidden",
    ...ds.shadow.soft,
  },
  memoryCopy: {
    flex: 1,
    minWidth: 0,
  },
  memoryCta: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: ds.color.action,
    borderRadius: ds.radius.full,
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    minHeight: 42,
    paddingHorizontal: 15,
  },
  memoryCtaText: {
    color: "#06111d",
    fontSize: ds.typography.caption,
    fontWeight: ds.weight.bold,
  },
  memoryGradient: {
    minHeight: ds.size.quizHero,
    padding: ds.space.md,
  },
  modeMeta: {
    color: "rgba(248,250,252,0.66)",
    fontSize: 13,
    fontWeight: ds.weight.medium,
    marginTop: 5,
  },
  modeTitle: {
    color: ds.color.text,
    fontSize: 27,
    fontWeight: ds.weight.bold,
    lineHeight: 30,
  },
  nextButton: {
    alignItems: "center",
    backgroundColor: ds.color.action,
    borderRadius: ds.radius.control,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  nextButtonText: {
    color: "#06111d",
    fontSize: ds.typography.body,
    fontWeight: ds.weight.bold,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  primaryGrid: {
    flexDirection: "row",
    gap: ds.space.sm,
  },
  quickCard: {
    alignItems: "center",
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: ds.space.sm,
    minHeight: 76,
    padding: ds.space.md,
  },
  quickCopy: {
    flex: 1,
    minWidth: 0,
  },
  quickMeta: {
    color: ds.color.muted,
    fontSize: ds.typography.caption,
    fontWeight: ds.weight.medium,
    marginTop: 3,
  },
  quickPlay: {
    alignItems: "center",
    backgroundColor: ds.color.action,
    borderRadius: ds.radius.full,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  quickTitle: {
    color: ds.color.text,
    fontSize: ds.typography.body,
    fontWeight: ds.weight.semibold,
  },
  questionCard: {
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.sheet,
    borderWidth: 1,
    padding: ds.space.md,
  },
  questionCounter: {
    color: ds.color.text,
    fontSize: 34,
    fontWeight: ds.weight.bold,
    lineHeight: 38,
  },
  questionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  questionPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,209,102,0.12)",
    borderRadius: ds.radius.full,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  questionPillText: {
    color: ds.color.text,
    fontSize: ds.typography.small,
    fontWeight: ds.weight.semibold,
  },
  questionText: {
    color: ds.color.text,
    fontSize: 22,
    fontWeight: ds.weight.bold,
    lineHeight: 27,
  },
  root: {
    flex: 1,
  },
  resultActions: {
    gap: ds.space.sm,
    marginTop: ds.space.lg,
    width: "100%",
  },
  resultBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,209,102,0.14)",
    borderColor: "rgba(255,209,102,0.28)",
    borderRadius: 28,
    borderWidth: 1,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  resultContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  resultPrimary: {
    alignItems: "center",
    backgroundColor: ds.color.action,
    borderRadius: ds.radius.control,
    justifyContent: "center",
    minHeight: 52,
  },
  resultPrimaryText: {
    color: "#06111d",
    fontSize: ds.typography.body,
    fontWeight: ds.weight.bold,
  },
  resultScore: {
    color: ds.color.text,
    fontSize: 54,
    fontWeight: ds.weight.bold,
    lineHeight: 60,
    marginTop: ds.space.lg,
  },
  resultSecondary: {
    alignItems: "center",
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  resultSecondaryText: {
    color: ds.color.text,
    fontSize: ds.typography.body,
    fontWeight: ds.weight.semibold,
  },
  resultText: {
    color: ds.color.muted,
    fontSize: ds.typography.body,
    fontWeight: ds.weight.medium,
    marginTop: 8,
    textAlign: "center",
  },
  resultTitle: {
    color: ds.color.text,
    fontSize: ds.typography.title,
    fontWeight: ds.weight.bold,
    marginTop: 4,
  },
  sectionTitle: {
    color: ds.color.text,
    fontSize: ds.typography.section,
    fontWeight: ds.weight.semibold,
  },
  sectionIntro: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 2,
  },
  sectionLink: {
    color: ds.color.muted,
    fontSize: ds.typography.caption,
    fontWeight: ds.weight.medium,
  },
  sectionSubtitle: {
    color: ds.color.muted,
    fontSize: ds.typography.caption,
    fontWeight: ds.weight.medium,
  },
  screenTitle: {
    color: ds.color.text,
    fontSize: 30,
    fontWeight: ds.weight.bold,
    lineHeight: 34,
  },
  statCard: {
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 82,
    padding: 10,
  },
  statIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  statLabel: {
    color: ds.color.muted,
    fontSize: 10,
    fontWeight: ds.weight.medium,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statValue: {
    color: ds.color.text,
    fontSize: 19,
    fontWeight: ds.weight.bold,
    marginTop: 8,
  },
  streakPill: {
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  streakText: {
    color: ds.color.text,
    fontSize: ds.typography.caption,
    fontWeight: ds.weight.bold,
  },
  title: {
    color: ds.color.text,
    fontSize: ds.typography.hero,
    fontWeight: ds.weight.bold,
    lineHeight: 30,
    marginTop: 4,
    maxWidth: 245,
  },
  toast: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  toastText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: ds.weight.semibold,
  },
});
