import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { BookOpen, Bookmark, Bot, Brain, Check, ChevronLeft, Flame, Heart, Layers3, Pencil, Star, Trophy, X, Zap, type LucideIcon } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { GoalCelebration } from "../components/GoalCelebration";
import { GradeIcon } from "../components/GradeIcon";
import { LoadingState } from "../components/ScreenState";
import { SwipeBackView } from "../components/SwipeBackView";
import { GrummButton } from "../components/GrummButton";
import { mobileConfig, userMessages } from "../config/app";
import { useAuth } from "../context/AuthContext";
import { trackMobileAnalyticsEvent } from "../lib/analytics";
import { getGoalCelebrationMessage } from "../lib/badges";
import { getProfileSummary, getQuizStatsSummary } from "../lib/facts";
import { getLearningGoalLabel, learningGoalOptions, normalizeLearningGoal, type LearningGoal } from "../lib/learning";
import { updateProfileEmail, updateProfilePassword, updateProfileSettings, type ProfileField } from "../lib/profile";
import { colors } from "../theme/colors";
import { designTokens as ds } from "../theme/designTokens";
import { mobileDesign } from "../theme/mobile";
import type { ProfileSummary, QuizStatsSummary } from "../types/domain";
import { AuthScreen } from "./AuthScreen";

type FieldErrors = Partial<Record<ProfileField, string>>;

export function ProfileScreen({ onOpenMemoryChallenge }: { onOpenMemoryChallenge?: () => void }) {
  const insets = useSafeAreaInsets();
  const { error: authError, isLoading: isAuthLoading, profile, refreshProfile, session, signOut } = useAuth();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [quizStats, setQuizStats] = useState<QuizStatsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [celebration, setCelebration] = useState(false);

  useEffect(() => {
    void trackMobileAnalyticsEvent({ eventName: "profile_opened" });
  }, []);

  const loadSummary = useCallback(async () => {
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
      loadSummary();
    });

    return () => cancelAnimationFrame(frame);
  }, [loadSummary]);

  if (isAuthLoading) {
    return <LoadingState label="Ouverture de ton espace..." />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  const displayName = summary?.username ?? profile?.username ?? profile?.email ?? "Lecteur Grumm";
  const dailyGoal = summary?.dailyGoal ?? profile?.dailyGoal ?? mobileConfig.dailyGoal;
  const todayReadCount = summary?.todayReadCount ?? 0;
  const dailyPercent = Math.min(100, Math.round((todayReadCount / Math.max(dailyGoal, 1)) * 100));
  const gradeTitle = summary?.gradeTitle ?? "Curieux débutant";
  const gradeBadge = summary?.gradeBadge ?? "sparkles";
  const completedGoals = summary?.completedDailyGoals ?? 0;
  const learningGoal = summary?.learningGoal ?? profile?.learningGoal;
  const canReplayCelebration = todayReadCount >= dailyGoal;
  const readCount = summary?.uniqueViewsCount ?? 0;
  const gradeStep = 50;
  const gradeProgress = Math.min(100, Math.round(((readCount % gradeStep) / gradeStep) * 100));
  const nextGradeRemaining = gradeStep - (readCount % gradeStep || gradeStep);
  const bestScore = quizStats?.bestScore ?? null;
  const weekProgress = [true, completedGoals > 0, todayReadCount > 0, false, false, false, false];

  async function replayCelebration() {
    setCelebration(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCelebration(false), 1900);
  }

  if (isEditing) {
    return (
      <ProfileEditView
        email={summary?.email ?? profile?.email ?? ""}
        onBack={() => setIsEditing(false)}
        onChanged={async () => {
          await refreshProfile();
          await loadSummary();
        }}
        profile={summary}
      />
    );
  }

  return (
    <LinearGradient colors={ds.gradient.app} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={ds.gradient.profile} style={styles.header}>
          <Pressable onPress={() => setIsEditing(true)} style={styles.editButton}>
            <Pencil color={ds.color.text} size={17} strokeWidth={2.3} />
          </Pressable>
          <View style={styles.profileHeroRow}>
            <View style={styles.robotAvatar}>
              <View style={styles.robotGlow} />
              <Bot color={ds.color.text} size={42} strokeWidth={2.05} />
            </View>
            <View style={styles.headerIdentity}>
              <Text style={styles.eyebrow}>Profil</Text>
              <Text numberOfLines={1} style={styles.title}>{displayName}</Text>
              <View style={styles.gradeLine}>
                <View style={styles.gradeBadgeMini}>
                  <GradeIcon badge={gradeBadge} size={22} />
                </View>
                <Text numberOfLines={1} style={styles.rankTitle}>{gradeTitle}</Text>
              </View>
              <Text style={styles.levelText}>{getLearningGoalLabel(learningGoal)}</Text>
            </View>
          </View>

          <View style={styles.gradeProgressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.panelValue}>Prochain grade</Text>
              <Text style={styles.panelHint}>{nextGradeRemaining} faits</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${gradeProgress}%` }]} />
            </View>
          </View>
        </LinearGradient>

        {authError || error ? <Text style={styles.error}>{authError ?? error}</Text> : null}
        {isLoading ? <LoadingState label="Lecture du profil..." /> : null}

        <Text style={styles.sectionTitle}>Objectif quotidien</Text>
        <LinearGradient colors={ds.gradient.goal} style={styles.dailyHero}>
          <ProgressRing percent={dailyPercent} />
          <View style={styles.dailyTextBlock}>
            <Text style={styles.panelLabel}>Aujourd’hui</Text>
            <Text style={styles.dailyCount}>
              {todayReadCount}/{dailyGoal}
            </Text>
            <WeekDots progress={weekProgress} />
            {canReplayCelebration ? (
              <Pressable onPress={() => void replayCelebration()} style={styles.replayButton}>
                <Flame color={ds.color.orange} size={17} strokeWidth={2.25} />
                <Text style={styles.replayText}>Réussite</Text>
              </Pressable>
            ) : null}
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Statistiques</Text>
        <View style={styles.metricGrid}>
          <MetricPill Icon={BookOpen} color={ds.color.discovery} label="Faits lus" value={readCount} />
          <MetricPill Icon={Flame} color={ds.color.orange} label="Jours actifs" value={completedGoals} />
          <MetricPill Icon={Trophy} color={ds.color.progress} label="Score quiz" value={bestScore ? `${bestScore}%` : "—"} />
          <MetricPill Icon={Layers3} color={ds.color.action} label="Thèmes" value={summary?.topThemes.length ?? 0} />
        </View>

        <ThemeSection themes={summary?.topThemes ?? []} />

        <Text style={styles.sectionTitle}>Défi mémoire</Text>
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            onOpenMemoryChallenge?.();
          }}
          style={({ pressed }) => [styles.memoryPanel, pressed && styles.pressed]}
        >
          <LinearGradient colors={ds.gradient.memory} style={styles.memoryGradient}>
            <View style={styles.memoryIcon}>
              <Brain color={ds.color.text} size={30} strokeWidth={2.2} />
            </View>
            <View style={styles.memoryTextBlock}>
              <Text style={styles.memoryTitle}>Défi mémoire</Text>
              <Text style={styles.memoryMeta}>{summary?.savedCount ?? 0} faits à réactiver</Text>
            </View>
            <View style={styles.memoryArrow}>
              <Zap color="#06111d" size={18} strokeWidth={2.5} />
            </View>
          </LinearGradient>
        </Pressable>

        <ProfileFactSection
          empty="Aucun fait enregistré pour le moment."
          facts={summary?.savedFacts ?? []}
          Icon={Bookmark}
          title="Sauvegardes"
        />

        <View style={styles.settingsBlock}>
          <GrummButton onPress={loadSummary} variant="secondary">
            Actualiser
          </GrummButton>
          <GrummButton onPress={signOut} variant="ghost">
            Se déconnecter
          </GrummButton>
        </View>
      </ScrollView>

      <GoalCelebration
        completedGoals={completedGoals}
        message={getGoalCelebrationMessage(completedGoals)}
        visible={celebration}
      />
    </LinearGradient>
  );
}

function ProfileEditView({
  email,
  onBack,
  onChanged,
  profile,
}: {
  email: string;
  onBack: () => void;
  onChanged: () => Promise<void>;
  profile: ProfileSummary | null;
}) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [dailyGoal, setDailyGoal] = useState(String(profile?.dailyGoal ?? mobileConfig.dailyGoal));
  const [learningGoal, setLearningGoal] = useState<LearningGoal>(normalizeLearningGoal(profile?.learningGoal));
  const [nextEmail, setNextEmail] = useState(email);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<"email" | "password" | "settings" | null>(null);

  async function handleResult(result: Awaited<ReturnType<typeof updateProfileSettings>>) {
    if (!result.ok) {
      setErrors({ [result.field]: result.message });
      setMessage(null);
      return;
    }

    setErrors({});
    setMessage(result.message);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await onChanged();
  }

  async function submitSettings() {
    setIsSubmitting("settings");
    await handleResult(
      await updateProfileSettings({
        dailyGoal: Number(dailyGoal),
        learningGoal,
        username,
      }),
    );
    setIsSubmitting(null);
  }

  async function submitEmail() {
    setIsSubmitting("email");
    await handleResult(await updateProfileEmail(nextEmail));
    setIsSubmitting(null);
  }

  async function submitPassword() {
    setIsSubmitting("password");
    const result = await updateProfilePassword(password);
    await handleResult(result);
    if (result.ok) {
      setPassword("");
    }
    setIsSubmitting(null);
  }

  return (
    <SwipeBackView onBack={onBack} style={styles.root}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <ScrollView contentContainerStyle={[styles.editContent, { paddingTop: insets.top + 14 }]} showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ChevronLeft color={colors.text} size={20} strokeWidth={2.4} />
          <Text style={styles.backText}>Profil</Text>
        </Pressable>

        <Text style={styles.editTitle}>Modifier le profil</Text>

        <View style={styles.formPanel}>
          <Text style={styles.formLabel}>Pseudo</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setUsername}
            onSubmitEditing={submitSettings}
            placeholder="pseudo"
            placeholderTextColor="rgba(248,250,252,0.42)"
            returnKeyType="done"
            style={styles.input}
            value={username}
          />
          <FieldError message={errors.username} />

          <Text style={styles.formLabel}>Objectif quotidien</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setDailyGoal}
            onSubmitEditing={submitSettings}
            placeholder="10"
            placeholderTextColor="rgba(248,250,252,0.42)"
            returnKeyType="done"
            style={styles.input}
            value={dailyGoal}
          />
          <FieldError message={errors.dailyGoal} />

          <Text style={styles.formLabel}>Objectif culturel</Text>
          <View style={styles.learningGoalList}>
            {learningGoalOptions.map((option) => {
              const selected = learningGoal === option.value;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={option.value}
                  onPress={() => setLearningGoal(option.value)}
                  style={[styles.learningGoalOption, selected && styles.learningGoalOptionSelected]}
                >
                  <Text style={styles.learningGoalLabel}>{option.label}</Text>
                  <Text style={styles.learningGoalDescription}>{option.description}</Text>
                </Pressable>
              );
            })}
          </View>
          <FieldError message={errors.learningGoal} />

          <GrummButton disabled={isSubmitting === "settings"} isLoading={isSubmitting === "settings"} onPress={submitSettings}>
            Mettre à jour
          </GrummButton>
        </View>

        <View style={styles.formPanel}>
          <Text style={styles.formLabel}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setNextEmail}
            onSubmitEditing={submitEmail}
            placeholder="email"
            placeholderTextColor="rgba(248,250,252,0.42)"
            returnKeyType="done"
            style={styles.input}
            value={nextEmail}
          />
          <FieldError message={errors.email} />
          <GrummButton disabled={isSubmitting === "email"} isLoading={isSubmitting === "email"} onPress={submitEmail} variant="secondary">
            Changer l&apos;email
          </GrummButton>

          <Text style={styles.formLabel}>Nouveau mot de passe</Text>
          <TextInput
            onChangeText={setPassword}
            onSubmitEditing={submitPassword}
            placeholder="8 caractères minimum"
            placeholderTextColor="rgba(248,250,252,0.42)"
            returnKeyType="done"
            secureTextEntry
            style={styles.input}
            value={password}
          />
          <FieldError message={errors.password} />
          <GrummButton
            disabled={isSubmitting === "password" || password.length === 0}
            isLoading={isSubmitting === "password"}
            onPress={submitPassword}
            variant="secondary"
          >
            Changer le mot de passe
          </GrummButton>
        </View>

        {message ? (
          <View style={styles.success}>
            <Check color={colors.cyan} size={18} strokeWidth={2.4} />
            <Text style={styles.successText}>{message}</Text>
          </View>
        ) : null}
        <FieldError message={errors.global} />
      </ScrollView>
    </KeyboardAvoidingView>
    </SwipeBackView>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.fieldError}>
      <X color={colors.danger} size={15} strokeWidth={2.4} />
      <Text style={styles.fieldErrorText}>{message}</Text>
    </View>
  );
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 116;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const dashOffset = circumference - (circumference * clampedPercent) / 100;

  return (
    <View style={styles.ringWrap}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={stroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={ds.color.goal}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={stroke}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.ringValue}>{clampedPercent}%</Text>
    </View>
  );
}

function WeekDots({ progress }: { progress: boolean[] }) {
  const labels = ["L", "M", "M", "J", "V", "S", "D"];

  return (
    <View style={styles.weekRow}>
      {labels.map((label, index) => (
        <View key={`${label}-${index}`} style={[styles.weekDot, progress[index] && styles.weekDotActive]}>
          <Text style={[styles.weekLabel, progress[index] && styles.weekLabelActive]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function MetricPill({ Icon, color, label, value }: { Icon: LucideIcon; color: string; label: string; value: number | string }) {
  return (
    <View style={styles.metricPill}>
      <View style={[styles.metricIcon, { backgroundColor: color }]}>
        <Icon color="#06111d" size={16} strokeWidth={2.45} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ThemeSection({ themes }: { themes: ProfileSummary["topThemes"] }) {
  const visibleThemes = themes.slice(0, 4);
  const maxCount = Math.max(...visibleThemes.map((theme) => theme.count), 1);

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>Top thèmes</Text>
      <View style={styles.profileSection}>
        {visibleThemes.length > 0 ? (
          <View style={styles.themeGrid}>
            {visibleThemes.map((theme) => (
              <View key={theme.slug} style={[styles.themeMiniCard, { borderColor: `${theme.accent}55` }]}>
                {theme.imageUrl ? (
                  <ImageBackground resizeMode="cover" source={{ uri: theme.imageUrl }} style={styles.themeImage}>
                    <View style={styles.themeImageScrim} />
                  </ImageBackground>
                ) : (
                  <View style={[styles.themeAura, { backgroundColor: theme.accent }]} />
                )}
                <View style={[styles.themeIllustration, { backgroundColor: theme.accent }]}>
                  <Star color="#06111d" size={18} strokeWidth={2.5} />
                </View>
                <Text numberOfLines={1} style={styles.themeMiniName}>{theme.name}</Text>
                <View style={styles.themeMiniFooter}>
                  <Text style={styles.themeMiniCount}>{theme.count} faits</Text>
                  <View style={styles.themeTrack}>
                    <View
                      style={[
                        styles.themeFill,
                        {
                          backgroundColor: theme.accent,
                          width: `${Math.max(18, Math.round((theme.count / maxCount) * 100))}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyInline}>Lis quelques faits pour faire émerger tes thèmes.</Text>
        )}
      </View>
    </View>
  );
}

function ProfileFactSection({
  empty,
  facts,
  Icon,
  title,
}: {
  empty: string;
  facts: ProfileSummary["likedFacts"];
  Icon: typeof Heart;
  title: string;
}) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Icon color={ds.color.goal} size={18} strokeWidth={2.3} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.profileSection}>
        {facts.length > 0 ? (
          <View style={styles.factPreviewList}>
            {facts.slice(0, 4).map((fact) => (
              <View key={fact.id} style={styles.factPreview}>
                <Text numberOfLines={1} style={[styles.factCategory, { color: fact.accent }]}>
                  {fact.category}
                </Text>
                <Text numberOfLines={2} style={styles.factTitle}>
                  {fact.title}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyInline}>{empty}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 13,
  },
  backText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: mobileDesign.weight.semibold,
  },
  content: {
    gap: ds.space.sm,
    padding: ds.space.gutter,
    paddingBottom: 30,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.control,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 16,
    top: 16,
    width: 44,
  },
  editContent: {
    gap: 16,
    paddingBottom: 30,
    paddingHorizontal: 18,
  },
  dailyCount: {
    color: ds.color.text,
    fontSize: 31,
    fontWeight: ds.weight.bold,
    lineHeight: 34,
    marginTop: 5,
  },
  dailyHero: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: ds.radius.sheet,
    borderWidth: 1,
    flexDirection: "row",
    gap: ds.space.md,
    minHeight: 148,
    overflow: "hidden",
    padding: ds.space.md,
    ...ds.shadow.soft,
  },
  dailyTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  dashboardPanel: {
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.card,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  editTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: mobileDesign.weight.bold,
    lineHeight: 32,
  },
  email: {
    color: "rgba(248,250,252,0.46)",
    flex: 1,
    fontSize: 13,
    fontWeight: mobileDesign.weight.medium,
  },
  emailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 8,
    minWidth: 0,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: mobileDesign.weight.semibold,
    lineHeight: 20,
  },
  emptyInline: {
    color: ds.color.muted,
    fontSize: 14,
    fontWeight: mobileDesign.weight.medium,
    lineHeight: 21,
  },
  eyebrow: {
    color: ds.color.action,
    fontSize: ds.typography.small,
    fontWeight: ds.weight.bold,
    textTransform: "uppercase",
  },
  fieldError: {
    alignItems: "center",
    backgroundColor: "rgba(255,122,144,0.10)",
    borderColor: "rgba(255,122,144,0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 11,
  },
  fieldErrorText: {
    color: "#ffd7de",
    flex: 1,
    fontSize: 12,
    fontWeight: mobileDesign.weight.medium,
    lineHeight: 17,
  },
  factCategory: {
    fontSize: 11,
    fontWeight: mobileDesign.weight.semibold,
    textTransform: "uppercase",
  },
  factPreview: {
    borderBottomColor: "rgba(255,255,255,0.10)",
    borderBottomWidth: 1,
    gap: 7,
    paddingVertical: 13,
  },
  factPreviewList: {
    gap: 2,
  },
  factTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: mobileDesign.weight.semibold,
    lineHeight: 21,
  },
  formLabel: {
    color: "rgba(248,250,252,0.72)",
    fontSize: 13,
    fontWeight: mobileDesign.weight.semibold,
  },
  formPanel: {
    backgroundColor: "rgba(255,255,255,0.045)",
    borderBottomColor: "rgba(255,255,255,0.12)",
    borderBottomWidth: 1,
    gap: 12,
    paddingVertical: 18,
  },
  gradeRing: {
    alignItems: "center",
    backgroundColor: "rgba(5,8,18,0.42)",
    borderColor: "rgba(255,209,102,0.28)",
    borderRadius: 16,
    borderWidth: 1,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  header: {
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.sheet,
    borderWidth: 1,
    gap: ds.space.md,
    minHeight: 164,
    overflow: "hidden",
    padding: ds.space.md,
    paddingRight: 62,
    ...ds.shadow.soft,
  },
  headerIdentity: {
    flex: 1,
    minWidth: 0,
  },
  headerTop: {
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  gradeBadgeMini: {
    alignItems: "center",
    backgroundColor: "rgba(5,8,18,0.42)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  gradeLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: mobileDesign.weight.semibold,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  learningGoalDescription: {
    color: "rgba(248,250,252,0.50)",
    fontSize: 12,
    fontWeight: mobileDesign.weight.medium,
    lineHeight: 17,
    marginTop: 4,
  },
  learningGoalLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: mobileDesign.weight.semibold,
  },
  learningGoalList: {
    gap: 9,
  },
  learningGoalOption: {
    backgroundColor: "rgba(255,255,255,0.065)",
    borderColor: "rgba(255,255,255,0.11)",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  learningGoalOptionSelected: {
    backgroundColor: "rgba(244,234,213,0.12)",
    borderColor: "rgba(244,234,213,0.34)",
  },
  panelHint: {
    color: ds.color.muted,
    fontSize: 12,
    fontWeight: ds.weight.medium,
    marginTop: 3,
  },
  panelLabel: {
    color: ds.color.text,
    fontSize: 14,
    fontWeight: ds.weight.semibold,
  },
  panelValue: {
    color: ds.color.text,
    fontSize: 15,
    fontWeight: ds.weight.semibold,
  },
  progressFill: {
    backgroundColor: ds.color.progress,
    borderRadius: 999,
    height: "100%",
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressPanel: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    height: 8,
    marginTop: 11,
    overflow: "hidden",
  },
  gradeProgressBlock: {
    backgroundColor: "rgba(5,8,18,0.24)",
    borderColor: ds.color.stroke,
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
  },
  metaGrid: {
    gap: 9,
  },
  metricLabel: {
    color: ds.color.muted,
    fontSize: 11,
    fontWeight: ds.weight.medium,
    marginTop: 5,
  },
  metricPill: {
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.card,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 86,
    minWidth: "47%",
    padding: 12,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ds.space.sm,
  },
  metricIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 30,
    justifyContent: "center",
    marginBottom: 8,
    width: 30,
  },
  metricValue: {
    color: ds.color.text,
    fontSize: 21,
    fontWeight: ds.weight.bold,
  },
  metaItem: {
    alignItems: "center",
    backgroundColor: "rgba(5,8,18,0.24)",
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 13,
  },
  metaLabel: {
    color: "rgba(248,250,252,0.40)",
    fontSize: 10,
    fontWeight: mobileDesign.weight.semibold,
    textTransform: "uppercase",
  },
  metaTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  metaValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: mobileDesign.weight.semibold,
    marginTop: 2,
  },
  rankCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,209,102,0.10)",
    borderColor: "rgba(255,209,102,0.20)",
    borderRadius: 21,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    maxWidth: 156,
    minHeight: 78,
    padding: 11,
  },
  rankLabel: {
    color: "rgba(255,209,102,0.72)",
    fontSize: 10,
    fontWeight: mobileDesign.weight.semibold,
    textTransform: "uppercase",
  },
  rankTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  rankTitle: {
    color: ds.color.text,
    flex: 1,
    fontSize: 14,
    fontWeight: ds.weight.semibold,
    lineHeight: 18,
  },
  replayButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  replayText: {
    color: ds.color.orange,
    fontSize: 13,
    fontWeight: mobileDesign.weight.semibold,
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  ringValue: {
    color: ds.color.text,
    fontSize: 22,
    fontWeight: ds.weight.bold,
    position: "absolute",
  },
  ringWrap: {
    alignItems: "center",
    height: 116,
    justifyContent: "center",
    width: 116,
  },
  glowBottom: {
    backgroundColor: "rgba(106,227,192,0.12)",
    borderRadius: 999,
    bottom: -120,
    height: 260,
    left: -105,
    position: "absolute",
    width: 260,
  },
  glowTop: {
    backgroundColor: "rgba(167,139,250,0.18)",
    borderRadius: 999,
    height: 280,
    position: "absolute",
    right: -115,
    top: -90,
    width: 280,
  },
  profileSection: {
    backgroundColor: ds.color.card,
    borderColor: ds.color.stroke,
    borderRadius: ds.radius.card,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: ds.space.md,
    paddingVertical: ds.space.md,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  profileHeroRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: ds.space.md,
  },
  robotAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(167,139,250,0.22)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 26,
    borderWidth: 1,
    height: ds.size.profileAvatar,
    justifyContent: "center",
    overflow: "hidden",
    width: ds.size.profileAvatar,
  },
  robotGlow: {
    backgroundColor: "rgba(106,227,192,0.24)",
    borderRadius: ds.radius.full,
    height: 80,
    position: "absolute",
    right: -32,
    top: -30,
    width: 80,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  sectionBlock: {
    gap: ds.space.sm,
  },
  sectionTitle: {
    color: ds.color.text,
    fontSize: ds.typography.section,
    fontWeight: ds.weight.semibold,
  },
  settingsBlock: {
    gap: 8,
    opacity: 0.82,
    paddingTop: 2,
  },
  success: {
    alignItems: "center",
    backgroundColor: "rgba(106,227,192,0.10)",
    borderColor: "rgba(106,227,192,0.20)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    padding: 13,
  },
  successText: {
    color: "#c8ffee",
    flex: 1,
    fontSize: 13,
    fontWeight: mobileDesign.weight.semibold,
  },
  themeCount: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 999,
    color: "rgba(248,250,252,0.70)",
    fontSize: 12,
    fontWeight: "900",
    minWidth: 24,
    paddingHorizontal: 9,
    paddingVertical: 4,
    textAlign: "right",
  },
  themeDot: {
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  themeFill: {
    borderRadius: 999,
    height: "100%",
  },
  themeAura: {
    borderRadius: 999,
    height: 70,
    opacity: 0.30,
    position: "absolute",
    right: -18,
    top: -22,
    width: 70,
  },
  themeGrid: {
    gap: 10,
  },
  themeIllustration: {
    alignItems: "center",
    borderRadius: 16,
    height: 34,
    justifyContent: "center",
    marginBottom: 12,
    width: 34,
  },
  themeImage: {
    bottom: 0,
    left: 0,
    opacity: 0.36,
    position: "absolute",
    right: 0,
    top: 0,
  },
  themeImageScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7,17,29,0.42)",
  },
  themeList: {
    gap: 12,
  },
  themeMiniCard: {
    backgroundColor: "rgba(5,8,18,0.28)",
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 92,
    overflow: "hidden",
    padding: 14,
  },
  themeMiniCount: {
    color: "rgba(248,250,252,0.52)",
    fontSize: 12,
    fontWeight: mobileDesign.weight.medium,
  },
  themeMiniFooter: {
    gap: 9,
    marginTop: "auto",
  },
  themeMiniName: {
    color: ds.color.text,
    fontSize: 16,
    fontWeight: mobileDesign.weight.semibold,
    lineHeight: 20,
    maxWidth: "78%",
  },
  themeName: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: mobileDesign.weight.semibold,
  },
  themeRow: {
    alignItems: "center",
    backgroundColor: "rgba(5,8,18,0.18)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 54,
    paddingHorizontal: 13,
  },
  themeTextRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  themeTrack: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    flex: 1,
    height: 7,
    overflow: "hidden",
  },
  title: {
    color: ds.color.text,
    fontSize: 25,
    fontWeight: ds.weight.bold,
    lineHeight: 29,
    marginTop: 4,
  },
  levelText: {
    color: ds.color.muted,
    fontSize: 12,
    fontWeight: ds.weight.medium,
    marginTop: 5,
  },
  memoryArrow: {
    alignItems: "center",
    backgroundColor: ds.color.action,
    borderRadius: ds.radius.full,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  memoryGradient: {
    alignItems: "center",
    flexDirection: "row",
    gap: ds.space.sm,
    minHeight: 82,
    padding: ds.space.md,
  },
  memoryIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  memoryMeta: {
    color: ds.color.muted,
    fontSize: 12,
    fontWeight: ds.weight.medium,
    marginTop: 3,
  },
  memoryPanel: {
    borderRadius: ds.radius.card,
    overflow: "hidden",
  },
  memoryTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  memoryTitle: {
    color: ds.color.text,
    fontSize: 17,
    fontWeight: ds.weight.bold,
  },
  weekDot: {
    alignItems: "center",
    backgroundColor: "rgba(5,8,18,0.28)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: ds.radius.full,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  weekDotActive: {
    backgroundColor: ds.color.goal,
    borderColor: "rgba(255,209,102,0.64)",
  },
  weekLabel: {
    color: ds.color.muted,
    fontSize: 10,
    fontWeight: ds.weight.semibold,
  },
  weekLabelActive: {
    color: "#06111d",
  },
  weekRow: {
    flexDirection: "row",
    gap: 5,
    marginTop: 11,
  },
});
