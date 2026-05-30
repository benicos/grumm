import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Bookmark, CalendarDays, Check, ChevronLeft, Eye, Flag, Flame, Heart, Layers3, Mail, Pencil, ShieldCheck, Target, X, type LucideIcon } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoalCelebration } from "../components/GoalCelebration";
import { GradeIcon } from "../components/GradeIcon";
import { LoadingState } from "../components/ScreenState";
import { SwipeBackView } from "../components/SwipeBackView";
import { GrummButton } from "../components/GrummButton";
import { mobileConfig, userMessages } from "../config/app";
import { useAuth } from "../context/AuthContext";
import { trackMobileAnalyticsEvent } from "../lib/analytics";
import { getGoalCelebrationMessage } from "../lib/badges";
import { getProfileSummary } from "../lib/facts";
import { getLearningGoalLabel, learningGoalOptions, normalizeLearningGoal, type LearningGoal } from "../lib/learning";
import { updateProfileEmail, updateProfilePassword, updateProfileSettings, type ProfileField } from "../lib/profile";
import { colors } from "../theme/colors";
import type { ProfileSummary } from "../types/domain";
import { AuthScreen } from "./AuthScreen";

type FieldErrors = Partial<Record<ProfileField, string>>;

function formatProfileDate(value?: string | null) {
  if (!value) {
    return "Non disponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatRole(role?: string | null) {
  return role === "administrateur" ? "Administrateur" : "Membre";
}

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { error: authError, isLoading: isAuthLoading, profile, refreshProfile, session, signOut } = useAuth();
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
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
      setSummary(await getProfileSummary());
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
  const createdAt = summary?.createdAt ?? profile?.createdAt ?? null;
  const roleLabel = formatRole(summary?.role ?? profile?.role);
  const learningGoal = summary?.learningGoal ?? profile?.learningGoal;
  const canReplayCelebration = todayReadCount >= dailyGoal;

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
    <LinearGradient colors={["#07111f", "#101b2c", "#050812"]} style={styles.root}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["rgba(255,209,102,0.15)", "rgba(106,227,192,0.06)", "rgba(255,255,255,0.045)"]} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerIdentity}>
              <Text style={styles.eyebrow}>Profil</Text>
              <Text style={styles.title}>{displayName}</Text>
              {summary?.email ?? profile?.email ? (
                <View style={styles.emailRow}>
                  <Mail color="rgba(248,250,252,0.48)" size={15} strokeWidth={2.25} />
                  <Text numberOfLines={1} style={styles.email}>{summary?.email ?? profile?.email}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.rankCard}>
              <View style={styles.gradeRing}>
                <GradeIcon badge={gradeBadge} size={30} />
              </View>
              <View style={styles.rankTextBlock}>
                <Text style={styles.rankLabel}>Rang</Text>
                <Text numberOfLines={2} style={styles.rankTitle}>{gradeTitle}</Text>
              </View>
            </View>
          </View>

          <View style={styles.metaGrid}>
            <ProfileMeta Icon={CalendarDays} label="Inscription" value={formatProfileDate(createdAt)} />
            <ProfileMeta Icon={ShieldCheck} label="Rôle" value={roleLabel} />
            <ProfileMeta Icon={Flag} label="Objectif" value={`${dailyGoal} faits`} />
            <ProfileMeta Icon={Target} label="Niveau" value={getLearningGoalLabel(learningGoal)} />
          </View>

          <Pressable onPress={() => setIsEditing(true)} style={styles.editButton}>
            <Pencil color={colors.text} size={18} strokeWidth={2.3} />
          </Pressable>
        </LinearGradient>

        {authError || error ? <Text style={styles.error}>{authError ?? error}</Text> : null}
        {isLoading ? <LoadingState label="Lecture du profil..." /> : null}

        <View style={styles.progressPanel}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.panelLabel}>Progression quotidienne</Text>
              <Text style={styles.panelHint}>Faits uniques lus aujourd&apos;hui</Text>
            </View>
            <Text style={styles.panelValue}>
              {todayReadCount}/{dailyGoal}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${dailyPercent}%` }]} />
          </View>
          {canReplayCelebration ? (
            <Pressable onPress={() => void replayCelebration()} style={styles.replayButton}>
              <Flame color={colors.accent} size={17} strokeWidth={2.25} />
              <Text style={styles.replayText}>Revoir la réussite du jour</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statsGrid}>
          <StatCard Icon={Eye} label="Faits lus" value={summary?.uniqueViewsCount ?? 0} />
          <StatCard Icon={Heart} label="Faits aimés" value={summary?.likedCount ?? 0} />
          <StatCard Icon={Bookmark} label="Enregistrés" value={summary?.savedCount ?? 0} />
          <StatCard Icon={Target} label="Objectifs atteints" value={completedGoals} />
        </View>

        <ThemeSection themes={summary?.topThemes ?? []} />

        <ProfileFactSection
          empty="Aucun fait aimé pour le moment."
          facts={summary?.likedFacts ?? []}
          Icon={Heart}
          title="Faits aimés"
        />
        <ProfileFactSection
          empty="Aucun fait enregistré pour le moment."
          facts={summary?.savedFacts ?? []}
          Icon={Bookmark}
          title="Faits enregistrés"
        />

        <GrummButton onPress={loadSummary} variant="secondary">
          Actualiser
        </GrummButton>
        <GrummButton onPress={signOut} variant="ghost">
          Se déconnecter
        </GrummButton>
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

function ProfileMeta({ Icon, label, value }: { Icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Icon color={colors.accent} size={16} strokeWidth={2.35} />
      <View style={styles.metaTextBlock}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.metaValue}>{value}</Text>
      </View>
    </View>
  );
}

function StatCard({ Icon, label, value }: { Icon: typeof Eye; label: string; value: number | string }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Icon color={colors.accent} size={18} strokeWidth={2.35} />
      </View>
      <Text numberOfLines={2} adjustsFontSizeToFit style={styles.statValue}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ThemeSection({ themes }: { themes: ProfileSummary["topThemes"] }) {
  return (
    <View style={styles.profileSection}>
      <View style={styles.sectionHeader}>
        <Layers3 color={colors.accent} size={18} strokeWidth={2.3} />
        <Text style={styles.sectionTitle}>Thèmes les plus vus</Text>
      </View>
      {themes.length > 0 ? (
        <View style={styles.themeList}>
          {themes.map((theme) => (
            <View key={theme.slug} style={styles.themeRow}>
              <View style={styles.themeTextRow}>
                <View style={[styles.themeDot, { backgroundColor: theme.accent }]} />
                <Text numberOfLines={1} style={styles.themeName}>
                  {theme.name}
                </Text>
              </View>
              <Text style={styles.themeCount}>{theme.count}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyInline}>Lis quelques faits pour faire émerger tes thèmes.</Text>
      )}
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
    <View style={styles.profileSection}>
      <View style={styles.sectionHeader}>
        <Icon color={colors.accent} size={18} strokeWidth={2.3} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
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
    fontWeight: "900",
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 30,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderColor: colors.border,
    borderRadius: 16,
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
  editTitle: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
  },
  email: {
    color: "rgba(248,250,252,0.46)",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
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
    fontWeight: "700",
    lineHeight: 20,
  },
  emptyInline: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "900",
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
    fontWeight: "700",
    lineHeight: 17,
  },
  factCategory: {
    fontSize: 11,
    fontWeight: "900",
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
    fontWeight: "900",
    lineHeight: 21,
  },
  formLabel: {
    color: "rgba(248,250,252,0.72)",
    fontSize: 13,
    fontWeight: "900",
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
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    minHeight: 154,
    overflow: "hidden",
    padding: 18,
    paddingRight: 64,
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
  input: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    minHeight: 54,
    paddingHorizontal: 16,
  },
  learningGoalDescription: {
    color: "rgba(248,250,252,0.50)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 4,
  },
  learningGoalLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
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
    color: "rgba(248,250,252,0.45)",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  panelLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  panelValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  progressFill: {
    backgroundColor: colors.accent,
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
    height: 9,
    marginTop: 16,
    overflow: "hidden",
  },
  metaGrid: {
    gap: 9,
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
    fontWeight: "900",
    textTransform: "uppercase",
  },
  metaTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  metaValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
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
    fontWeight: "900",
    textTransform: "uppercase",
  },
  rankTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  rankTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
    marginTop: 3,
  },
  replayButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  replayText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "900",
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  glowBottom: {
    backgroundColor: "rgba(106,227,192,0.10)",
    borderRadius: 999,
    bottom: -120,
    height: 260,
    left: -105,
    position: "absolute",
    width: 260,
  },
  glowTop: {
    backgroundColor: "rgba(255,209,102,0.14)",
    borderRadius: 999,
    height: 280,
    position: "absolute",
    right: -115,
    top: -90,
    width: 280,
  },
  profileSection: {
    backgroundColor: "rgba(255,255,255,0.035)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 26,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
  },
  statCard: {
    backgroundColor: "rgba(255,255,255,0.052)",
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 24,
    borderWidth: 1,
    flexGrow: 1,
    minHeight: 104,
    minWidth: "45%",
    padding: 16,
  },
  statIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,209,102,0.10)",
    borderColor: "rgba(255,209,102,0.20)",
    borderRadius: 14,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    marginBottom: 12,
    width: 36,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statValue: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
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
    fontWeight: "800",
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
  themeList: {
    gap: 12,
  },
  themeName: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
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
    color: colors.text,
    fontSize: 31,
    fontWeight: "900",
    lineHeight: 35,
    marginTop: 7,
  },
});
