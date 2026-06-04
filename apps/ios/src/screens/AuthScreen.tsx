import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { AtSign, Check, ChevronLeft, Lock, Sparkles, UserRound } from "lucide-react-native";
import { type ReactNode, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GrummButton } from "../components/GrummButton";
import { GrummLogo } from "../components/GrummLogo";
import { mobileConfig } from "../config/app";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_LEARNING_GOAL, type LearningGoal } from "../lib/learning";
import { getUsernameValidationMessage, normalizeUsername } from "../lib/slug";
import { colors } from "../theme/colors";
import { designTokens as ds } from "../theme/designTokens";
import { mobileDesign } from "../theme/mobile";

type AuthStep = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const levelOptions: { description: string; label: string; value: LearningGoal }[] = [
  { description: "Reprendre les bases.", label: "Débutant", value: "basics" },
  { description: "Renforcer ta culture.", label: "Curieux", value: "strengthen" },
  { description: "Aller plus loin.", label: "Passionné", value: "advanced" },
];

const dailyGoalOptions = [5, 10, 20] as const;
const themeOptions = [
  "Histoire",
  "Science",
  "Cinéma",
  "Psychologie",
  "Espace",
  "Musique",
] as const;

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<AuthStep>(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [learningGoal, setLearningGoal] = useState<LearningGoal>(DEFAULT_LEARNING_GOAL);
  const [dailyGoal, setDailyGoal] = useState<number>(mobileConfig.dailyGoal);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);

  function switchMode(nextMode: "login" | "register") {
    setError(null);
    setMode(nextMode);
    setStep(0);
  }

  async function submitLogin() {
    setError(null);

    if (!email.trim() || password.length < 6) {
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email, password);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Connexion impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitRegister() {
    setError(null);
    const usernameError = getUsernameValidationMessage(normalizedUsername);

    if (usernameError) {
      setError(usernameError);
      setStep(1);
      return;
    }

    if (!email.trim() || password.length < 6) {
      setError("Entre un email et un mot de passe valide.");
      setStep(5);
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email, password, normalizedUsername, learningGoal, dailyGoal);
      setStep(6);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Inscription impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function nextStep() {
    setError(null);

    if (step === 1) {
      const usernameError = getUsernameValidationMessage(normalizedUsername);

      if (usernameError) {
        setError(usernameError);
        return;
      }
    }

    setStep((current) => Math.min(6, current + 1) as AuthStep);
  }

  function previousStep() {
    setError(null);
    setStep((current) => Math.max(0, current - 1) as AuthStep);
  }

  function toggleTheme(theme: string) {
    setSelectedThemes((current) =>
      current.includes(theme)
        ? current.filter((item) => item !== theme)
        : [...current, theme],
    );
  }

  return (
    <LinearGradient colors={ds.gradient.app} style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === "login" ? (
            <LoginView
              email={email}
              error={error}
              isSubmitting={isSubmitting}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={submitLogin}
              onSwitch={() => switchMode("register")}
              password={password}
            />
          ) : (
            <RegisterFlow
              dailyGoal={dailyGoal}
              email={email}
              error={error}
              isSubmitting={isSubmitting}
              learningGoal={learningGoal}
              normalizedUsername={normalizedUsername}
              onBack={step === 0 ? () => switchMode("login") : previousStep}
              onDailyGoalChange={setDailyGoal}
              onEmailChange={setEmail}
              onLearningGoalChange={setLearningGoal}
              onNext={nextStep}
              onPasswordChange={setPassword}
              onSubmit={submitRegister}
              onThemeToggle={toggleTheme}
              onUsernameChange={setUsername}
              password={password}
              selectedThemes={selectedThemes}
              step={step}
              username={username}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function LoginView({
  email,
  error,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onSwitch,
  password,
}: {
  email: string;
  error: string | null;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  onSwitch: () => void;
  password: string;
}) {
  return (
    <View style={styles.authCenter}>
      <GrummLogo size={58} />
      <Text style={styles.loginTitle}>Grumm.</Text>
      <Text style={styles.loginSubtitle}>Reprends ta progression.</Text>

      <View style={styles.fields}>
        <Field icon={<AtSign color="rgba(248,250,252,0.52)" size={18} strokeWidth={2.1} />}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={onEmailChange}
            placeholder="Email"
            placeholderTextColor="rgba(248,250,252,0.38)"
            style={styles.input}
            textContentType="emailAddress"
            value={email}
          />
        </Field>
        <Field icon={<Lock color="rgba(248,250,252,0.52)" size={18} strokeWidth={2.1} />}>
          <TextInput
            autoCapitalize="none"
            onChangeText={onPasswordChange}
            onSubmitEditing={onSubmit}
            placeholder="Mot de passe"
            placeholderTextColor="rgba(248,250,252,0.38)"
            returnKeyType="done"
            secureTextEntry
            style={styles.input}
            textContentType="password"
            value={password}
          />
        </Field>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <GrummButton disabled={!email || password.length < 6} isLoading={isSubmitting} onPress={onSubmit}>
          Se connecter
        </GrummButton>
        <GrummButton onPress={onSwitch} variant="ghost">
          Créer un compte
        </GrummButton>
      </View>
    </View>
  );
}

function RegisterFlow({
  dailyGoal,
  email,
  error,
  isSubmitting,
  learningGoal,
  normalizedUsername,
  onBack,
  onDailyGoalChange,
  onEmailChange,
  onLearningGoalChange,
  onNext,
  onPasswordChange,
  onSubmit,
  onThemeToggle,
  onUsernameChange,
  password,
  selectedThemes,
  step,
  username,
}: {
  dailyGoal: number;
  email: string;
  error: string | null;
  isSubmitting: boolean;
  learningGoal: LearningGoal;
  normalizedUsername: string;
  onBack: () => void;
  onDailyGoalChange: (value: number) => void;
  onEmailChange: (value: string) => void;
  onLearningGoalChange: (value: LearningGoal) => void;
  onNext: () => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  onThemeToggle: (theme: string) => void;
  onUsernameChange: (value: string) => void;
  password: string;
  selectedThemes: string[];
  step: AuthStep;
  username: string;
}) {
  return (
    <View style={styles.flow}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <ChevronLeft color={colors.text} size={18} strokeWidth={2.2} />
        <Text style={styles.backText}>Retour</Text>
      </Pressable>
      <View style={styles.progressDots}>
        {Array.from({ length: 7 }).map((_, index) => (
          <View key={index} style={[styles.progressDot, index <= step && styles.progressDotActive]} />
        ))}
      </View>

      {step === 0 ? (
        <StepShell
          action="Continuer"
          onAction={onNext}
          title="Bienvenue sur Grumm."
        >
          <GrummLogo size={70} />
          <Text style={styles.stepCopy}>Une habitude courte pour retenir plus de culture.</Text>
        </StepShell>
      ) : null}

      {step === 1 ? (
        <StepShell action="Continuer" onAction={onNext} title="Choisis ton pseudo">
          <Field icon={<UserRound color="rgba(248,250,252,0.52)" size={18} strokeWidth={2.1} />}>
            <TextInput
              autoCapitalize="none"
              autoComplete="username"
              onChangeText={onUsernameChange}
              placeholder="Pseudo"
              placeholderTextColor="rgba(248,250,252,0.38)"
              style={styles.input}
              textContentType="username"
              value={username}
            />
          </Field>
          {normalizedUsername ? <Text style={styles.hint}>@{normalizedUsername}</Text> : null}
        </StepShell>
      ) : null}

      {step === 2 ? (
        <StepShell action="Continuer" onAction={onNext} title="Quel est ton niveau ?">
          <View style={styles.optionGrid}>
            {levelOptions.map((option) => (
              <ChoiceCard
                key={option.value}
                label={option.label}
                meta={option.description}
                onPress={() => onLearningGoalChange(option.value)}
                selected={learningGoal === option.value}
              />
            ))}
          </View>
        </StepShell>
      ) : null}

      {step === 3 ? (
        <StepShell action="Continuer" onAction={onNext} title="Ton rythme quotidien">
          <View style={styles.goalGrid}>
            {dailyGoalOptions.map((value) => (
              <Pressable
                key={value}
                onPress={() => onDailyGoalChange(value)}
                style={[styles.goalChoice, dailyGoal === value && styles.choiceSelected]}
              >
                <Text style={styles.goalValue}>{value}</Text>
                <Text style={styles.goalLabel}>faits</Text>
              </Pressable>
            ))}
          </View>
        </StepShell>
      ) : null}

      {step === 4 ? (
        <StepShell action="Continuer" onAction={onNext} title="Choisis tes thèmes">
          <View style={styles.themeGrid}>
            {themeOptions.map((theme) => (
              <Pressable
                key={theme}
                onPress={() => onThemeToggle(theme)}
                style={[styles.themeChoice, selectedThemes.includes(theme) && styles.choiceSelected]}
              >
                <Text style={styles.themeChoiceText}>{theme}</Text>
              </Pressable>
            ))}
          </View>
        </StepShell>
      ) : null}

      {step === 5 ? (
        <StepShell action="Créer le compte" isLoading={isSubmitting} onAction={onSubmit} title="Crée ton compte">
          <Field icon={<AtSign color="rgba(248,250,252,0.52)" size={18} strokeWidth={2.1} />}>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={onEmailChange}
              placeholder="Email"
              placeholderTextColor="rgba(248,250,252,0.38)"
              style={styles.input}
              textContentType="emailAddress"
              value={email}
            />
          </Field>
          <Field icon={<Lock color="rgba(248,250,252,0.52)" size={18} strokeWidth={2.1} />}>
            <TextInput
              autoCapitalize="none"
              onChangeText={onPasswordChange}
              onSubmitEditing={onSubmit}
              placeholder="Mot de passe"
              placeholderTextColor="rgba(248,250,252,0.38)"
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              textContentType="newPassword"
              value={password}
            />
          </Field>
        </StepShell>
      ) : null}

      {step === 6 ? (
        <StepShell action="Commencer à découvrir" onAction={() => undefined} title="Bienvenue.">
          <View style={styles.successBadge}>
            <Check color="#06111d" size={34} strokeWidth={2.5} />
          </View>
          <Text style={styles.stepCopy}>Ton parcours Grumm. est prêt.</Text>
        </StepShell>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function StepShell({
  action,
  children,
  isLoading,
  onAction,
  title,
}: {
  action: string;
  children: ReactNode;
  isLoading?: boolean;
  onAction: () => void | Promise<void>;
  title: string;
}) {
  return (
    <View style={styles.stepShell}>
      <Text style={styles.stepTitle}>{title}</Text>
      <View style={styles.stepBody}>{children}</View>
      <GrummButton isLoading={isLoading} onPress={onAction}>
        {action}
      </GrummButton>
    </View>
  );
}

function ChoiceCard({
  label,
  meta,
  onPress,
  selected,
}: {
  label: string;
  meta: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.choiceCard, selected && styles.choiceSelected]}>
      <Sparkles color={selected ? colors.accent : "rgba(248,250,252,0.52)"} size={19} strokeWidth={2.1} />
      <Text style={styles.choiceTitle}>{label}</Text>
      <Text style={styles.choiceMeta}>{meta}</Text>
    </Pressable>
  );
}

function Field({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <View style={styles.field}>
      {icon}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 8,
    marginTop: 8,
  },
  authCenter: {
    flex: 1,
    justifyContent: "center",
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 5,
    minHeight: 38,
  },
  backText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: mobileDesign.weight.semibold,
  },
  choiceCard: {
    backgroundColor: "rgba(255,255,255,0.055)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    minHeight: 126,
    padding: 14,
  },
  choiceMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: mobileDesign.weight.medium,
    lineHeight: 17,
    marginTop: 5,
  },
  choiceSelected: {
    backgroundColor: "rgba(244,234,213,0.12)",
    borderColor: "rgba(244,234,213,0.36)",
  },
  choiceTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: mobileDesign.weight.bold,
    marginTop: 12,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 30,
    paddingHorizontal: mobileDesign.space.screenX,
  },
  error: {
    backgroundColor: "rgba(255,122,144,0.10)",
    borderColor: "rgba(255,122,144,0.20)",
    borderRadius: 14,
    borderWidth: 1,
    color: "#ffd7de",
    fontSize: 13,
    fontWeight: mobileDesign.weight.semibold,
    lineHeight: 18,
    marginTop: 12,
    padding: 12,
  },
  field: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.075)",
    borderColor: "rgba(255,255,255,0.11)",
    borderRadius: mobileDesign.radius.control,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 14,
  },
  fields: {
    gap: 11,
    marginTop: 28,
  },
  flow: {
    flex: 1,
    gap: 18,
  },
  glowTop: {
    backgroundColor: "rgba(255,209,102,0.16)",
    borderRadius: 999,
    height: 260,
    position: "absolute",
    right: -110,
    top: -90,
    width: 260,
  },
  goalChoice: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minHeight: 112,
    justifyContent: "center",
  },
  goalGrid: {
    flexDirection: "row",
    gap: 10,
  },
  goalLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: mobileDesign.weight.medium,
  },
  goalValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: mobileDesign.weight.bold,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: mobileDesign.weight.medium,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: mobileDesign.weight.medium,
    minHeight: 50,
  },
  keyboard: {
    flex: 1,
  },
  loginSubtitle: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: mobileDesign.weight.medium,
    marginTop: 5,
  },
  loginTitle: {
    color: colors.text,
    fontSize: 34,
    fontWeight: mobileDesign.weight.bold,
    marginTop: 18,
  },
  optionGrid: {
    gap: 10,
  },
  progressDot: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    flex: 1,
    height: 4,
  },
  progressDotActive: {
    backgroundColor: colors.accent,
  },
  progressDots: {
    flexDirection: "row",
    gap: 5,
  },
  root: {
    flex: 1,
  },
  stepBody: {
    gap: 12,
  },
  stepCopy: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: mobileDesign.weight.medium,
    lineHeight: 23,
    maxWidth: 280,
  },
  stepShell: {
    flex: 1,
    gap: 20,
    justifyContent: "center",
  },
  stepTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: mobileDesign.weight.bold,
    lineHeight: 36,
  },
  successBadge: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 78,
    justifyContent: "center",
    width: 78,
  },
  themeChoice: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    width: "48%",
  },
  themeChoiceText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: mobileDesign.weight.semibold,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});
