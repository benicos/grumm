import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  ArrowRight,
  BookOpenText,
  Bookmark,
  Brain,
  CalendarCheck2,
  CheckCircle2,
  Compass,
  Flame,
  LogOut,
  Pencil,
  Sparkles,
  Target,
  Trophy,
  UserRound,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppScreen } from "../components/AppScreen";
import { EmptyState, LoadingState } from "../components/ScreenState";
import { DEFAULT_GRADES, type GradeDefinition } from "../lib/badges";
import { mobileConfig, userMessages } from "../config/app";
import { useAuth } from "../context/AuthContext";
import { getProfileSummary, getQuizStatsSummary } from "../lib/facts";
import { getLearningGoalLabel, normalizeLearningGoal } from "../lib/learning";
import { updateProfileSettings } from "../lib/profile";
import { appTheme, withAlpha } from "../theme/appTheme";
import type { ProfileSummary, QuizStatsSummary } from "../types/domain";
import { AuthScreen } from "./AuthScreen";

type ProfileScreenProps = {
  onOpenFeed?: () => void;
  onOpenQuiz?: () => void;
  onOpenThemes?: () => void;
};

type GradeProgress = {
  current: GradeDefinition;
  currentValue: number;
  isMax: boolean;
  next: GradeDefinition | null;
  percent: number;
  remaining: number;
  target: number;
};

export function ProfileScreen({ onOpenFeed, onOpenQuiz, onOpenThemes }: ProfileScreenProps) {
  const {
    error: authError,
    isLoading: isAuthLoading,
    profile,
    refreshProfile,
    session,
    signOut,
  } = useAuth();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [quizStats, setQuizStats] = useState<QuizStatsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [nextSummary, nextQuizStats] = await Promise.all([
        getProfileSummary(),
        getQuizStatsSummary().catch(() => null),
      ]);
      setSummary(nextSummary);
      setQuizStats(nextQuizStats);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : userMessages.genericLoadError);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadProfile();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadProfile]);

  if (isAuthLoading) {
    return (
      <AppScreen>
        <LoadingState label="Ouverture du profil..." />
      </AppScreen>
    );
  }

  if (!session) {
    if (showAuth) {
      return <AuthScreen />;
    }

    return (
      <AppScreen>
        <EmptyState
          Icon={UserRound}
          actionLabel="Se connecter"
          message="Le feed reste accessible. Connecte-toi pour sauvegarder et suivre ta progression."
          onAction={() => setShowAuth(true)}
          title="Profil non connecté"
        />
      </AppScreen>
    );
  }

  if (isEditing) {
    return (
      <ProfileEditView
        onBack={() => setIsEditing(false)}
        onSaved={async () => {
          await refreshProfile();
          await loadProfile();
          setIsEditing(false);
        }}
        profile={summary ?? profile}
      />
    );
  }

  const displayName = summary?.username ?? profile?.username ?? "Lecteur Grumm";
  const email = summary?.email ?? profile?.email ?? session.user.email ?? "";
  const dailyGoal = summary?.dailyGoal ?? profile?.dailyGoal ?? mobileConfig.dailyGoal;
  const todayReadCount = summary?.todayReadCount ?? 0;
  const completedDailyGoals = summary?.completedDailyGoals ?? 0;
  const gradeTitle = summary?.gradeTitle ?? "Curieux";
  const learningGoal = summary?.learningGoal ?? profile?.learningGoal;
  const goalRatio = todayReadCount / Math.max(dailyGoal, 1);
  const goalPercent = Math.round(goalRatio * 100);
  const goalProgressWidth = Math.min(100, goalPercent);
  const hasReachedGoal = todayReadCount >= dailyGoal;
  const extraFacts = Math.max(0, todayReadCount - dailyGoal);
  const remainingFacts = Math.max(0, dailyGoal - todayReadCount);
  const gradeProgress = getGradeProgress(completedDailyGoals, gradeTitle);

  return (
    <AppScreen contentStyle={styles.screenContent} scroll>
      <ProfileHero
        displayName={displayName}
        email={email}
        gradeProgress={gradeProgress}
        gradeTitle={gradeTitle}
        learningGoalLabel={getLearningGoalLabel(learningGoal)}
        onEdit={() => setIsEditing(true)}
      />

      {authError || error ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{authError ?? error}</Text>
        </View>
      ) : null}
      {isLoading ? <LoadingState label="Lecture du profil..." /> : null}

      <DailyGoalCard
        dailyGoal={dailyGoal}
        extraFacts={extraFacts}
        hasReachedGoal={hasReachedGoal}
        progressWidth={goalProgressWidth}
        remainingFacts={remainingFacts}
        todayReadCount={todayReadCount}
        totalPercent={goalPercent}
      />

      <WeekGoalPanel
        days={summary?.weeklyGoalDays ?? getFallbackWeekDays()}
        hasData={Boolean(summary)}
        streak={summary?.streakCount ?? 0}
      />

      <NextUnlockCard gradeProgress={gradeProgress} />

      <JourneyStats quizStats={quizStats} summary={summary} />

      <ResumeSection
        onOpenFeed={onOpenFeed}
        onOpenQuiz={onOpenQuiz}
        onOpenThemes={onOpenThemes}
      />

      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>Paramètres</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsEditing(true)}
          style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
        >
          <View style={styles.settingsIcon}>
            <Pencil color={appTheme.color.ink} size={17} strokeWidth={2.25} />
          </View>
          <Text style={styles.settingsText}>Modifier le profil</Text>
          <ArrowRight color={appTheme.color.muted} size={16} strokeWidth={2.4} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
        >
          <LogOut color={appTheme.color.danger} size={17} strokeWidth={2.25} />
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function ProfileHero({
  displayName,
  email,
  gradeProgress,
  gradeTitle,
  learningGoalLabel,
  onEdit,
}: {
  displayName: string;
  email: string;
  gradeProgress: GradeProgress;
  gradeTitle: string;
  learningGoalLabel: string;
  onEdit: () => void;
}) {
  return (
    <LinearGradient
      colors={["#172033", "#284764", "#1ea7a1"]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.heroCard}
    >
      <View style={styles.heroHalo} />
      <Pressable accessibilityRole="button" onPress={onEdit} style={styles.editButton}>
        <Pencil color="#ffffff" size={17} strokeWidth={2.25} />
      </Pressable>

      <View style={styles.identityRow}>
        <View style={styles.avatarFrame}>
          <LinearGradient
            colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.62)"]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{getInitial(displayName)}</Text>
          </LinearGradient>
          <View style={styles.avatarBadge}>
            <Trophy color={appTheme.color.ink} size={15} strokeWidth={2.4} />
          </View>
        </View>
        <View style={styles.identityCopy}>
          <Text style={styles.heroKicker}>Profil</Text>
          <Text numberOfLines={1} style={styles.heroName}>{displayName}</Text>
          {email ? <Text numberOfLines={1} style={styles.heroEmail}>{email}</Text> : null}
        </View>
      </View>

      <View style={styles.heroGradeRow}>
        <View style={styles.gradeStatus}>
          <Text style={styles.gradeLabel}>Grade actuel</Text>
          <Text numberOfLines={1} style={styles.gradeTitle}>{gradeTitle}</Text>
        </View>
        <View style={styles.learningPill}>
          <Compass color="#ffffff" size={14} strokeWidth={2.35} />
          <Text numberOfLines={1} style={styles.learningText}>{learningGoalLabel}</Text>
        </View>
      </View>

      <View style={styles.heroProgress}>
        <View style={styles.heroProgressHeader}>
          <Text style={styles.nextGradeLabel}>
            {gradeProgress.isMax ? "Grade maximum atteint" : `Prochain grade : ${gradeProgress.next?.name}`}
          </Text>
          <Text style={styles.heroProgressCount}>
            {gradeProgress.isMax
              ? `${gradeProgress.currentValue} objectifs`
              : `${gradeProgress.currentValue} / ${gradeProgress.target}`}
          </Text>
        </View>
        <View style={styles.heroProgressTrack}>
          <View style={[styles.heroProgressFill, { width: `${gradeProgress.percent}%` }]} />
        </View>
      </View>
    </LinearGradient>
  );
}

function DailyGoalCard({
  dailyGoal,
  extraFacts,
  hasReachedGoal,
  progressWidth,
  remainingFacts,
  todayReadCount,
  totalPercent,
}: {
  dailyGoal: number;
  extraFacts: number;
  hasReachedGoal: boolean;
  progressWidth: number;
  remainingFacts: number;
  todayReadCount: number;
  totalPercent: number;
}) {
  return (
    <LinearGradient
      colors={["rgba(71,184,129,0.14)", "rgba(255,255,255,0.72)"]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.goalCard}
    >
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Objectif quotidien</Text>
          <Text style={styles.goalMeta}>{todayReadCount} / {dailyGoal} faits lus</Text>
        </View>
        <View style={[styles.goalBadge, hasReachedGoal && styles.goalBadgeDone]}>
          {hasReachedGoal ? (
            <CheckCircle2 color="#ffffff" size={19} strokeWidth={2.4} />
          ) : (
            <Target color={appTheme.color.green} size={19} strokeWidth={2.4} />
          )}
          <Text style={[styles.goalBadgeText, hasReachedGoal && styles.goalBadgeTextDone]}>
            {hasReachedGoal ? "Atteint" : `${totalPercent}%`}
          </Text>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
      </View>
      <Text style={styles.goalMessage}>
        {hasReachedGoal
          ? extraFacts > 0
            ? `Objectif dépassé : +${extraFacts} fait${extraFacts > 1 ? "s" : ""}.`
            : "Objectif atteint aujourd'hui."
          : `Encore ${remainingFacts} fait${remainingFacts > 1 ? "s" : ""} pour atteindre ton objectif.`}
      </Text>
    </LinearGradient>
  );
}

function WeekGoalPanel({
  days,
  hasData,
  streak,
}: {
  days: ProfileSummary["weeklyGoalDays"];
  hasData: boolean;
  streak: number;
}) {
  const labels = ["L", "M", "M", "J", "V", "S", "D"];
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <View style={styles.weekPanel}>
      <View style={styles.weekHeader}>
        <View style={styles.panelIcon}>
          <Flame color={appTheme.color.green} size={20} strokeWidth={2.25} />
        </View>
        <View style={styles.panelCopy}>
          <Text style={styles.panelTitle}>Série actuelle</Text>
          <Text style={styles.panelText}>
            {hasData && streak > 0
              ? `Tu avances depuis ${streak} jour${streak > 1 ? "s" : ""}. Continue le rituel.`
              : "Commence ta première série aujourd'hui."}
          </Text>
        </View>
      </View>

      <View style={styles.weekDots}>
        {days.map((day, index) => {
          const isToday = index === todayIndex;
          const isFuture = index > todayIndex;
          const isMissed = !day.completed && !isToday && !isFuture && hasData;

          return (
            <View key={day.date} style={styles.weekDay}>
              <View
                style={[
                  styles.weekDot,
                  day.completed && styles.weekDotDone,
                  isToday && !day.completed && styles.weekDotToday,
                  isFuture && styles.weekDotFuture,
                  isMissed && styles.weekDotMissed,
                ]}
              >
                <Text
                  style={[
                    styles.weekDotText,
                    day.completed && styles.weekDotTextDone,
                    isToday && !day.completed && styles.weekDotTextToday,
                  ]}
                >
                  {labels[index]}
                </Text>
              </View>
              <Text style={styles.weekDayCount}>
                {day.completed ? "OK" : isToday ? "En cours" : isFuture ? "À venir" : "Discret"}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function NextUnlockCard({ gradeProgress }: { gradeProgress: GradeProgress }) {
  return (
    <LinearGradient
      colors={["rgba(124,92,255,0.14)", "rgba(255,255,255,0.72)"]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.unlockCard}
    >
      <View style={styles.unlockIcon}>
        {gradeProgress.isMax ? (
          <Sparkles color={appTheme.color.violet} size={22} strokeWidth={2.35} />
        ) : (
          <Trophy color={appTheme.color.violet} size={22} strokeWidth={2.35} />
        )}
      </View>
      <View style={styles.unlockCopy}>
        <Text style={styles.unlockLabel}>
          {gradeProgress.isMax ? "Progression" : "Prochain déblocage"}
        </Text>
        <Text numberOfLines={1} style={styles.unlockTitle}>
          {gradeProgress.isMax ? "Grade maximum atteint" : gradeProgress.next?.name}
        </Text>
        <Text style={styles.unlockText}>
          {gradeProgress.isMax
            ? "Continue à enrichir ta bibliothèque."
            : `Plus que ${gradeProgress.remaining} objectif${gradeProgress.remaining > 1 ? "s" : ""} pour l'atteindre.`}
        </Text>
        {!gradeProgress.isMax ? (
          <View style={styles.unlockTrack}>
            <View style={[styles.unlockFill, { width: `${gradeProgress.percent}%` }]} />
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}

function JourneyStats({
  quizStats,
  summary,
}: {
  quizStats: QuizStatsSummary | null;
  summary: ProfileSummary | null;
}) {
  const stats = [
    {
      Icon: BookOpenText,
      color: appTheme.color.teal,
      label: "faits lus",
      value: summary?.uniqueViewsCount ?? 0,
    },
    {
      Icon: Bookmark,
      color: appTheme.color.violet,
      label: "enregistrés",
      value: summary?.savedCount ?? 0,
    },
    {
      Icon: Brain,
      color: appTheme.color.accent,
      label: "quiz joués",
      value: quizStats?.sessionsCount ?? 0,
    },
    {
      Icon: Trophy,
      color: appTheme.color.yellow,
      label: "meilleur score",
      value: typeof quizStats?.bestScore === "number" ? `${quizStats.bestScore}%` : "-",
    },
  ];

  return (
    <View style={styles.journeySection}>
      <View>
        <Text style={styles.sectionTitle}>Ton parcours</Text>
        <Text style={styles.sectionHint}>
          {summary ? "Des repères courts de ta progression." : "Ton parcours commence ici."}
        </Text>
      </View>
      <View style={styles.statsGrid}>
        {stats.map(({ Icon, color, label, value }) => (
          <View key={label} style={styles.statTile}>
            <View style={[styles.statIcon, { backgroundColor: withAlpha(color, 0.13) }]}>
              <Icon color={color} size={17} strokeWidth={2.35} />
            </View>
            <Text numberOfLines={1} style={styles.statValue}>{value}</Text>
            <Text numberOfLines={1} style={styles.statLabel}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ResumeSection({
  onOpenFeed,
  onOpenQuiz,
  onOpenThemes,
}: {
  onOpenFeed?: () => void;
  onOpenQuiz?: () => void;
  onOpenThemes?: () => void;
}) {
  const actions = [
    { Icon: BookOpenText, label: "Lire un fait", onPress: onOpenFeed },
    { Icon: Brain, label: "Défi mémoire", onPress: onOpenQuiz },
    { Icon: Compass, label: "Explorer", onPress: onOpenThemes },
  ];

  return (
    <View style={styles.resumeSection}>
      <Text style={styles.sectionTitle}>Reprendre</Text>
      <View style={styles.resumeActions}>
        {actions.map(({ Icon, label, onPress }) => (
          <Pressable
            accessibilityRole="button"
            key={label}
            onPress={onPress}
            style={({ pressed }) => [styles.resumeButton, pressed && styles.pressed]}
          >
            <Icon color={appTheme.color.ink} size={18} strokeWidth={2.35} />
            <Text numberOfLines={1} style={styles.resumeText}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ProfileEditView({
  onBack,
  onSaved,
  profile,
}: {
  onBack: () => void;
  onSaved: () => Promise<void>;
  profile: Pick<ProfileSummary, "dailyGoal" | "learningGoal" | "username"> | null;
}) {
  const [username, setUsername] = useState(profile?.username ?? "");
  const [dailyGoal, setDailyGoal] = useState(String(profile?.dailyGoal ?? mobileConfig.dailyGoal));
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    setMessage(null);

    const result = await updateProfileSettings({
      dailyGoal: Number(dailyGoal),
      learningGoal: normalizeLearningGoal(profile?.learningGoal),
      username,
    });

    if (!result.ok) {
      setMessage(result.message);
      setIsSubmitting(false);
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onSaved();
    setIsSubmitting(false);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
      <AppScreen contentStyle={styles.screenContent} scroll>
        <View style={styles.header}>
          <Text style={styles.kicker}>Profil</Text>
          <Text style={styles.title}>Modifier</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Pseudo</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setUsername}
            placeholder="Pseudo"
            placeholderTextColor={appTheme.color.muted}
            style={styles.input}
            value={username}
          />

          <Text style={styles.inputLabel}>Objectif quotidien</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setDailyGoal}
            placeholder="10"
            placeholderTextColor={appTheme.color.muted}
            style={styles.input}
            value={dailyGoal}
          />

          {message ? <Text style={styles.formMessage}>{message}</Text> : null}
        </View>

        <Pressable
          disabled={isSubmitting}
          onPress={() => void submit()}
          style={[styles.primaryButton, isSubmitting && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? "Mise à jour..." : "Enregistrer"}
          </Text>
        </Pressable>
        <Pressable onPress={onBack} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Annuler</Text>
        </Pressable>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

function getGradeProgress(completedDailyGoals: number, currentTitle: string): GradeProgress {
  const completed = Math.max(0, completedDailyGoals);
  const grades = [...DEFAULT_GRADES].sort((a, b) => a.requiredGoals - b.requiredGoals);
  const current =
    grades.reduce(
      (active, grade) => (completed >= grade.requiredGoals ? grade : active),
      grades[0],
    ) ?? grades[0];
  const next = grades.find((grade) => grade.requiredGoals > completed) ?? null;

  if (!next) {
    return {
      current: { ...current, name: currentTitle || current.name },
      currentValue: completed,
      isMax: true,
      next: null,
      percent: 100,
      remaining: 0,
      target: current.requiredGoals,
    };
  }

  const span = Math.max(1, next.requiredGoals - current.requiredGoals);
  const currentValue = Math.max(0, completed - current.requiredGoals);

  return {
    current: { ...current, name: currentTitle || current.name },
    currentValue: completed,
    isMax: false,
    next,
    percent: Math.min(100, Math.round((currentValue / span) * 100)),
    remaining: Math.max(0, next.requiredGoals - completed),
    target: next.requiredGoals,
  };
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "G";
}

function getFallbackWeekDays(): ProfileSummary["weeklyGoalDays"] {
  return Array.from({ length: 7 }, (_, dayIndex) => ({
    completed: false,
    count: 0,
    date: `fallback-${dayIndex}`,
    dayIndex,
  }));
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 31,
    height: 62,
    justifyContent: "center",
    width: 62,
  },
  avatarBadge: {
    alignItems: "center",
    backgroundColor: appTheme.color.yellow,
    borderColor: "rgba(255,255,255,0.75)",
    borderRadius: appTheme.radius.pill,
    borderWidth: 2,
    bottom: -4,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: -4,
    width: 28,
  },
  avatarFrame: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 38,
    borderWidth: 1,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  avatarText: {
    color: appTheme.color.ink,
    fontSize: 27,
    fontWeight: appTheme.weight.bold,
  },
  cardHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  disabled: {
    opacity: 0.56,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: appTheme.radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 14,
    top: 14,
    width: 40,
    zIndex: 2,
  },
  formCard: {
    backgroundColor: appTheme.color.card,
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 16,
    ...appTheme.shadow.card,
  },
  formMessage: {
    color: appTheme.color.danger,
    fontSize: 13,
    fontWeight: appTheme.weight.semibold,
    lineHeight: 18,
  },
  goalBadge: {
    alignItems: "center",
    backgroundColor: withAlpha(appTheme.color.green, 0.13),
    borderRadius: appTheme.radius.pill,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 11,
  },
  goalBadgeDone: {
    backgroundColor: appTheme.color.green,
  },
  goalBadgeText: {
    color: appTheme.color.green,
    fontSize: 13,
    fontWeight: appTheme.weight.bold,
  },
  goalBadgeTextDone: {
    color: "#ffffff",
  },
  goalCard: {
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: appTheme.radius.card,
    borderWidth: 1,
    padding: 16,
  },
  goalMessage: {
    color: appTheme.color.ink,
    fontSize: 14,
    fontWeight: appTheme.weight.semibold,
    lineHeight: 20,
    marginTop: 12,
  },
  goalMeta: {
    color: appTheme.color.muted,
    fontSize: 13,
    fontWeight: appTheme.weight.medium,
    marginTop: 4,
  },
  gradeLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: appTheme.weight.bold,
    textTransform: "uppercase",
  },
  gradeStatus: {
    flex: 1,
    minWidth: 0,
  },
  gradeTitle: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: appTheme.weight.bold,
    lineHeight: 26,
    marginTop: 2,
  },
  header: {
    gap: 3,
    paddingTop: 8,
  },
  heroCard: {
    borderRadius: 28,
    gap: 18,
    overflow: "hidden",
    padding: 18,
    paddingTop: 20,
    ...appTheme.shadow.card,
  },
  heroEmail: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 13,
    fontWeight: appTheme.weight.medium,
    marginTop: 3,
  },
  heroGradeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  heroHalo: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 100,
    height: 160,
    position: "absolute",
    right: -72,
    top: -54,
    width: 160,
  },
  heroKicker: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    textTransform: "uppercase",
  },
  heroName: {
    color: "#ffffff",
    fontSize: 25,
    fontWeight: appTheme.weight.bold,
    lineHeight: 30,
    marginTop: 2,
  },
  heroProgress: {
    gap: 9,
  },
  heroProgressCount: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
  },
  heroProgressFill: {
    backgroundColor: appTheme.color.yellow,
    borderRadius: appTheme.radius.pill,
    height: "100%",
  },
  heroProgressHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  heroProgressTrack: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: appTheme.radius.pill,
    height: 8,
    overflow: "hidden",
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 42,
  },
  identityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  input: {
    backgroundColor: appTheme.color.background,
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.control,
    borderWidth: 1,
    color: appTheme.color.ink,
    fontSize: 15,
    fontWeight: appTheme.weight.semibold,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  inputLabel: {
    color: appTheme.color.ink,
    fontSize: 13,
    fontWeight: appTheme.weight.semibold,
  },
  journeySection: {
    gap: 10,
  },
  keyboard: {
    flex: 1,
  },
  kicker: {
    color: appTheme.color.teal,
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    textTransform: "uppercase",
  },
  learningPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: appTheme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    maxWidth: "45%",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  learningText: {
    color: "#ffffff",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
  },
  nextGradeLabel: {
    color: "#ffffff",
    flex: 1,
    fontSize: 13,
    fontWeight: appTheme.weight.bold,
  },
  notice: {
    backgroundColor: withAlpha(appTheme.color.danger, 0.1),
    borderColor: withAlpha(appTheme.color.danger, 0.18),
    borderRadius: appTheme.radius.control,
    borderWidth: 1,
    padding: 13,
  },
  noticeText: {
    color: appTheme.color.danger,
    fontSize: 13,
    fontWeight: appTheme.weight.semibold,
    lineHeight: 18,
  },
  panelCopy: {
    flex: 1,
    minWidth: 0,
  },
  panelIcon: {
    alignItems: "center",
    backgroundColor: withAlpha(appTheme.color.green, 0.13),
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  panelText: {
    color: appTheme.color.muted,
    fontSize: 13,
    fontWeight: appTheme.weight.medium,
    lineHeight: 19,
    marginTop: 3,
  },
  panelTitle: {
    color: appTheme.color.ink,
    fontSize: 16,
    fontWeight: appTheme.weight.bold,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: appTheme.color.ink,
    borderRadius: appTheme.radius.control,
    justifyContent: "center",
    minHeight: 52,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: appTheme.weight.bold,
  },
  progressFill: {
    backgroundColor: appTheme.color.green,
    borderRadius: appTheme.radius.pill,
    height: "100%",
  },
  progressTrack: {
    backgroundColor: withAlpha(appTheme.color.green, 0.13),
    borderRadius: appTheme.radius.pill,
    height: 9,
    marginTop: 15,
    overflow: "hidden",
  },
  resumeActions: {
    flexDirection: "row",
    gap: 9,
  },
  resumeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: appTheme.color.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 7,
    minHeight: 82,
    padding: 10,
  },
  resumeSection: {
    gap: 10,
  },
  resumeText: {
    color: appTheme.color.ink,
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    textAlign: "center",
  },
  screenContent: {
    gap: 16,
    paddingTop: 8,
  },
  secondaryButton: {
    alignItems: "center",
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
  sectionHint: {
    color: appTheme.color.muted,
    fontSize: 13,
    fontWeight: appTheme.weight.medium,
    marginTop: 3,
  },
  sectionTitle: {
    color: appTheme.color.ink,
    fontSize: 17,
    fontWeight: appTheme.weight.bold,
  },
  settingsIcon: {
    alignItems: "center",
    backgroundColor: withAlpha(appTheme.color.ink, 0.06),
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  settingsRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 12,
  },
  settingsSection: {
    gap: 10,
    paddingTop: 4,
  },
  settingsText: {
    color: appTheme.color.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: appTheme.weight.bold,
  },
  signOutButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 2,
  },
  signOutText: {
    color: appTheme.color.danger,
    fontSize: 14,
    fontWeight: appTheme.weight.bold,
  },
  statIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  statLabel: {
    color: appTheme.color.muted,
    fontSize: 12,
    fontWeight: appTheme.weight.medium,
  },
  statTile: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: appTheme.color.border,
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    gap: 5,
    minHeight: 96,
    padding: 12,
    width: "47%",
  },
  statValue: {
    color: appTheme.color.ink,
    fontSize: 22,
    fontWeight: appTheme.weight.bold,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  unlockCard: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: appTheme.radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 13,
    padding: 15,
  },
  unlockCopy: {
    flex: 1,
    minWidth: 0,
  },
  unlockFill: {
    backgroundColor: appTheme.color.violet,
    borderRadius: appTheme.radius.pill,
    height: "100%",
  },
  unlockIcon: {
    alignItems: "center",
    backgroundColor: withAlpha(appTheme.color.violet, 0.13),
    borderRadius: 20,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  unlockLabel: {
    color: appTheme.color.violet,
    fontSize: 11,
    fontWeight: appTheme.weight.bold,
    textTransform: "uppercase",
  },
  unlockText: {
    color: appTheme.color.muted,
    fontSize: 13,
    fontWeight: appTheme.weight.medium,
    lineHeight: 18,
    marginTop: 3,
  },
  unlockTitle: {
    color: appTheme.color.ink,
    fontSize: 17,
    fontWeight: appTheme.weight.bold,
    marginTop: 2,
  },
  unlockTrack: {
    backgroundColor: withAlpha(appTheme.color.violet, 0.12),
    borderRadius: appTheme.radius.pill,
    height: 7,
    marginTop: 10,
    overflow: "hidden",
  },
  weekDay: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  weekDayCount: {
    color: appTheme.color.muted,
    fontSize: 9.5,
    fontWeight: appTheme.weight.semibold,
    textAlign: "center",
  },
  weekDot: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  weekDotDone: {
    backgroundColor: appTheme.color.green,
    borderColor: withAlpha(appTheme.color.green, 0.52),
  },
  weekDotFuture: {
    opacity: 0.58,
  },
  weekDotMissed: {
    backgroundColor: "rgba(255,255,255,0.42)",
  },
  weekDotText: {
    color: appTheme.color.muted,
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
  },
  weekDotTextDone: {
    color: "#ffffff",
  },
  weekDotTextToday: {
    color: appTheme.color.green,
  },
  weekDotToday: {
    borderColor: appTheme.color.green,
    borderWidth: 2,
  },
  weekDots: {
    flexDirection: "row",
    gap: 5,
    marginTop: 14,
  },
  weekHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  weekPanel: {
    backgroundColor: withAlpha(appTheme.color.green, 0.08),
    borderColor: withAlpha(appTheme.color.green, 0.18),
    borderRadius: appTheme.radius.card,
    borderWidth: 1,
    padding: 14,
  },
  title: {
    color: appTheme.color.ink,
    fontSize: 24,
    fontWeight: appTheme.weight.bold,
    lineHeight: 29,
  },
});
