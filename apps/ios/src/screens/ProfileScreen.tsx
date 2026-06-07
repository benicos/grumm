import * as Haptics from "expo-haptics";
import {
  BookOpenText,
  Bookmark,
  CalendarCheck2,
  Flame,
  LogOut,
  Pencil,
  Target,
  Trophy,
  UserRound,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
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
import { ProfileStat } from "../components/ProfileStat";
import { mobileConfig, userMessages } from "../config/app";
import { useAuth } from "../context/AuthContext";
import { getProfileSummary, getQuizStatsSummary } from "../lib/facts";
import { getLearningGoalLabel, normalizeLearningGoal } from "../lib/learning";
import { updateProfileSettings } from "../lib/profile";
import { appTheme, withAlpha } from "../theme/appTheme";
import type { ProfileSummary, QuizStatsSummary } from "../types/domain";
import { AuthScreen } from "./AuthScreen";

export function ProfileScreen() {
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
  const goalPercent = Math.min(100, Math.round((todayReadCount / Math.max(dailyGoal, 1)) * 100));
  const gradeTitle = summary?.gradeTitle ?? "Curieux";
  const learningGoal = summary?.learningGoal ?? profile?.learningGoal;

  return (
    <AppScreen scroll>
      <View style={styles.headerCard}>
        <Pressable accessibilityRole="button" onPress={() => setIsEditing(true)} style={styles.editButton}>
          <Pencil color={appTheme.color.ink} size={18} strokeWidth={2.25} />
        </Pressable>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitial(displayName)}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.kicker}>Profil</Text>
            <Text numberOfLines={1} style={styles.name}>
              {displayName}
            </Text>
            {email ? (
              <Text numberOfLines={1} style={styles.email}>
                {email}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.gradeRow}>
          <View style={styles.gradePill}>
            <Trophy color={appTheme.color.yellow} size={17} strokeWidth={2.25} />
            <Text numberOfLines={1} style={styles.gradeText}>
              {gradeTitle}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.goalText}>
            {getLearningGoalLabel(learningGoal)}
          </Text>
        </View>
      </View>

      {authError || error ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{authError ?? error}</Text>
        </View>
      ) : null}
      {isLoading ? <LoadingState label="Lecture du profil..." /> : null}

      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View>
            <Text style={styles.sectionTitle}>Objectif quotidien</Text>
            <Text style={styles.goalMeta}>
              {todayReadCount}/{dailyGoal} faits lus
            </Text>
          </View>
          <View style={styles.goalBubble}>
            <Text style={styles.goalBubbleText}>{goalPercent}%</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${goalPercent}%` }]} />
        </View>
      </View>

      <WeekGoalPanel
        days={summary?.weeklyGoalDays ?? getFallbackWeekDays()}
        hasData={Boolean(summary)}
        streak={summary?.streakCount ?? 0}
      />

      <View style={styles.statsGrid}>
        <ProfileStat
          Icon={BookOpenText}
          color={appTheme.color.teal}
          label="Faits lus"
          value={summary?.uniqueViewsCount ?? 0}
        />
        <ProfileStat
          Icon={Bookmark}
          color={appTheme.color.violet}
          label="Enregistres"
          value={summary?.savedCount ?? 0}
        />
        <ProfileStat
          Icon={Target}
          color={appTheme.color.accent}
          label="Quiz joues"
          value={quizStats?.sessionsCount ?? 0}
        />
        <ProfileStat
          Icon={Flame}
          color="#f2a93b"
          label="Serie"
          value={summary?.streakCount ?? 0}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => void signOut()}
        style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
      >
        <LogOut color={appTheme.color.danger} size={18} strokeWidth={2.25} />
        <Text style={styles.signOutText}>Se déconnecter</Text>
      </Pressable>
    </AppScreen>
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
      <AppScreen scroll>
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

  return (
    <View style={styles.weekPanel}>
      <View style={styles.weekHeader}>
        <View style={styles.panelIcon}>
          <CalendarCheck2 color={appTheme.color.green} size={20} strokeWidth={2.25} />
        </View>
        <View style={styles.panelCopy}>
          <Text style={styles.panelTitle}>Série actuelle</Text>
          <Text style={styles.panelText}>
            {hasData ? `${streak} jour${streak > 1 ? "s" : ""}` : "Progression à venir"}
          </Text>
        </View>
      </View>

      <View style={styles.weekDots}>
        {days.map((day, index) => (
          <View key={day.date} style={styles.weekDay}>
            <View style={[styles.weekDot, day.completed && styles.weekDotDone]}>
              <Text style={[styles.weekDotText, day.completed && styles.weekDotTextDone]}>
                {labels[index]}
              </Text>
            </View>
            <Text style={styles.weekDayCount}>{day.completed ? "OK" : day.count > 0 ? day.count : "-"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
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
    backgroundColor: withAlpha(appTheme.color.teal, 0.14),
    borderColor: withAlpha(appTheme.color.teal, 0.22),
    borderRadius: 24,
    borderWidth: 1,
    height: 62,
    justifyContent: "center",
    width: 62,
  },
  avatarText: {
    color: appTheme.color.teal,
    fontSize: 24,
    fontWeight: appTheme.weight.bold,
  },
  disabled: {
    opacity: 0.56,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 14,
    top: 14,
    width: 40,
  },
  email: {
    color: appTheme.color.muted,
    fontSize: 13,
    fontWeight: appTheme.weight.medium,
    marginTop: 3,
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
  goalBubble: {
    alignItems: "center",
    backgroundColor: withAlpha(appTheme.color.green, 0.13),
    borderRadius: appTheme.radius.pill,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  goalBubbleText: {
    color: appTheme.color.green,
    fontSize: 16,
    fontWeight: appTheme.weight.bold,
  },
  goalCard: {
    backgroundColor: appTheme.color.card,
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.card,
    borderWidth: 1,
    padding: 16,
    ...appTheme.shadow.card,
  },
  goalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  goalMeta: {
    color: appTheme.color.muted,
    fontSize: 13,
    fontWeight: appTheme.weight.medium,
    marginTop: 4,
  },
  goalText: {
    color: appTheme.color.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: appTheme.weight.medium,
    textAlign: "right",
  },
  gradePill: {
    alignItems: "center",
    backgroundColor: withAlpha(appTheme.color.yellow, 0.14),
    borderRadius: appTheme.radius.pill,
    flexDirection: "row",
    gap: 7,
    maxWidth: "55%",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  gradeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 18,
  },
  gradeText: {
    color: appTheme.color.ink,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: appTheme.weight.semibold,
  },
  header: {
    gap: 3,
    paddingTop: 8,
  },
  headerCard: {
    backgroundColor: appTheme.color.cardSoft,
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.card,
    borderWidth: 1,
    overflow: "hidden",
    padding: 16,
    paddingRight: 62,
    ...appTheme.shadow.card,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
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
  keyboard: {
    flex: 1,
  },
  kicker: {
    color: appTheme.color.teal,
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    textTransform: "uppercase",
  },
  name: {
    color: appTheme.color.ink,
    fontSize: 23,
    fontWeight: appTheme.weight.bold,
    lineHeight: 27,
    marginTop: 2,
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
    opacity: 0.72,
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
    height: 8,
    marginTop: 15,
    overflow: "hidden",
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
  sectionTitle: {
    color: appTheme.color.ink,
    fontSize: 17,
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  weekDay: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  weekDayCount: {
    color: appTheme.color.muted,
    fontSize: 10,
    fontWeight: appTheme.weight.semibold,
  },
  weekDot: {
    alignItems: "center",
    backgroundColor: appTheme.color.background,
    borderColor: appTheme.color.border,
    borderRadius: appTheme.radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  weekDotDone: {
    backgroundColor: appTheme.color.green,
    borderColor: withAlpha(appTheme.color.green, 0.52),
  },
  weekDotText: {
    color: appTheme.color.muted,
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
  },
  weekDotTextDone: {
    color: "#ffffff",
  },
  weekDots: {
    flexDirection: "row",
    gap: 7,
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
