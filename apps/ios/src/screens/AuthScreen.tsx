import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { AtSign, Check, ChevronLeft, Lock, UserRound } from "lucide-react-native";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import grummDefault from "../../assets/grumm/default.png";
import grummHappy from "../../assets/grumm/happy.png";
import grummThinking from "../../assets/grumm/thinking.png";
import grummWave from "../../assets/grumm/wave.png";
import { AuthKeyboardLayout } from "../components/AuthKeyboardLayout";
import { mobileConfig } from "../config/app";
import { SwipeBackWrapper } from "../components/SwipeBackWrapper";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_LEARNING_GOAL, type LearningGoal } from "../lib/learning";
import { getUsernameValidationMessage, normalizeUsername } from "../lib/slug";
import { appTheme, withAlpha } from "../theme/appTheme";

const grummImages = {
  default: grummDefault,
  happy: grummHappy,
  thinking: grummThinking,
  wave: grummWave,
} as const;

type AuthMode = "welcome" | "login" | "signup";
type GrummMood = keyof typeof grummImages;
type SignupStep = "username" | "level" | "dailyGoal" | "email" | "password" | "confirmation";

const signupSteps: SignupStep[] = ["username", "level", "dailyGoal", "email", "password", "confirmation"];

const levelOptions: { label: string; value: LearningGoal }[] = [
  { label: "Je veux reprendre les bases tranquillement", value: "basics" },
  {
    label: "Je veux consolider mes bases et découvrir de nouvelles choses",
    value: "strengthen",
  },
  { label: "J'ai déjà de bonnes bases et je veux aller plus loin", value: "advanced" },
];

const dailyGoalOptions = [
  { label: "5 par jour, pour commencer doucement", value: 5 },
  { label: "10 par jour, le bon rythme", value: 10 },
  { label: "15 par jour, je veux progresser vite", value: 15 },
] as const;

function validatePassword(value: string) {
  return [
    { isValid: value.length >= 8, label: "8 caractères minimum" },
    { isValid: /[A-Z]/.test(value), label: "Une majuscule" },
    { isValid: /[a-z]/.test(value), label: "Une minuscule" },
    { isValid: /\d/.test(value), label: "Un chiffre" },
    { isValid: /[^A-Za-z0-9]/.test(value), label: "Un symbole" },
  ];
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>("welcome");
  const [signupStep, setSignupStep] = useState<SignupStep>("username");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [username, setUsername] = useState("");
  const [learningGoal, setLearningGoal] = useState<LearningGoal>(DEFAULT_LEARNING_GOAL);
  const [dailyGoal, setDailyGoal] = useState<number>(mobileConfig.dailyGoal);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mood, setMood] = useState<GrummMood>("wave");
  const [sceneOpacity] = useState(() => new Animated.Value(1));
  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
  const passwordChecks = useMemo(() => validatePassword(password), [password]);
  const currentStepIndex = signupSteps.indexOf(signupStep);

  useEffect(() => {
    sceneOpacity.setValue(0);
    Animated.timing(sceneOpacity, {
      duration: 260,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [mode, sceneOpacity, signupStep]);

  function openMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setMood(nextMode === "login" ? "wave" : "thinking");
  }

  const goBack = useCallback(() => {
    if (mode === "signup" && currentStepIndex > 0) {
      setSignupStep(signupSteps[currentStepIndex - 1]);
      setError(null);
      setMood("thinking");
      return;
    }

    setMode("welcome");
    setError(null);
    setMood("wave");
  }, [currentStepIndex, mode]);

  async function flashHappy(next: () => void) {
    setMood("happy");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setTimeout(() => {
      next();
      setMood("thinking");
    }, 320);
  }

  function validateCurrentStep() {
    if (signupStep === "username") {
      return getUsernameValidationMessage(normalizedUsername);
    }

    if (signupStep === "email" && !isValidEmail(email)) {
      return "Entre une adresse email valide.";
    }

    if (signupStep === "password" && passwordChecks.some((check) => !check.isValid)) {
      return "Le mot de passe ne respecte pas encore toutes les règles.";
    }

    if (signupStep === "confirmation" && passwordConfirmation !== password) {
      return "Les deux mots de passe ne correspondent pas.";
    }

    return null;
  }

  function nextSignupStep() {
    const validationError = validateCurrentStep();

    if (validationError) {
      setError(validationError);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      return;
    }

    setError(null);

    if (signupStep !== "confirmation") {
      const nextStep = signupSteps[currentStepIndex + 1];
      void flashHappy(() => setSignupStep(nextStep));
      return;
    }

    void submitSignup();
  }

  async function submitLogin() {
    if (!isValidEmail(email) || password.length < 1) {
      setError("Entre ton email et ton mot de passe.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signIn(email, password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Connexion impossible pour le moment.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitSignup() {
    const validationError = validateCurrentStep();

    if (validationError) {
      setError(validationError);
      return;
    }

    setMood("happy");
    setError(null);
    setIsSubmitting(true);
    try {
      await signUp(email, password, normalizedUsername, learningGoal, dailyGoal);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (nextError) {
      setMood("thinking");
      setError(nextError instanceof Error ? nextError.message : "Inscription impossible pour le moment.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <LinearGradient colors={appTheme.gradient.screen} style={styles.background}>
      <DecorativeBackground />
      <AuthKeyboardLayout contentStyle={styles.content}>
        <SwipeBackWrapper enabled={mode !== "welcome"} onSwipeBack={goBack} style={styles.swipeBackWrapper}>
          <Animated.View style={[styles.scene, { opacity: sceneOpacity }]}>
            {mode === "welcome" ? (
              <WelcomeScene onLogin={() => openMode("login")} onSignup={() => openMode("signup")} />
            ) : (
              <>
                <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
                  <ChevronLeft color={appTheme.color.ink} size={18} strokeWidth={2.2} />
                  <Text style={styles.backText}>Retour</Text>
                </Pressable>

                <GrummFigure mood={mood} />

                {mode === "login" ? (
                  <LoginScene
                    email={email}
                    error={error}
                    isSubmitting={isSubmitting}
                    onForgotPassword={() => void Linking.openURL(`${mobileConfig.siteUrl}/forgot-password`)}
                    onSignup={() => openMode("signup")}
                    onSubmit={() => void submitLogin()}
                    password={password}
                    setEmail={(value) => {
                      setEmail(value);
                      setError(null);
                    }}
                    setPassword={(value) => {
                      setPassword(value);
                      setError(null);
                    }}
                  />
                ) : (
                  <SignupScene
                    currentStepIndex={currentStepIndex}
                    dailyGoal={dailyGoal}
                    email={email}
                    error={error}
                    isSubmitting={isSubmitting}
                    learningGoal={learningGoal}
                    onNext={nextSignupStep}
                    password={password}
                    passwordChecks={passwordChecks}
                    passwordConfirmation={passwordConfirmation}
                    setDailyGoal={(value) => {
                      setDailyGoal(value);
                      setError(null);
                    }}
                    setEmail={(value) => {
                      setEmail(value);
                      setError(null);
                    }}
                    setLearningGoal={(value) => {
                      setLearningGoal(value);
                      setError(null);
                    }}
                    setPassword={(value) => {
                      setPassword(value);
                      setError(null);
                    }}
                    setPasswordConfirmation={(value) => {
                      setPasswordConfirmation(value);
                      setError(null);
                    }}
                    setUsername={(value) => {
                      setUsername(value);
                      setError(null);
                    }}
                    signupStep={signupStep}
                    username={username}
                  />
                )}
              </>
            )}
          </Animated.View>
        </SwipeBackWrapper>
      </AuthKeyboardLayout>
    </LinearGradient>
  );
}

function DecorativeBackground() {
  return (
    <>
      <View style={[styles.halo, styles.haloTop]} />
      <View style={[styles.halo, styles.haloBottom]} />
    </>
  );
}

function WelcomeScene({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  return (
    <>
      <View style={styles.topSpacer} />
      <GrummFigure large mood="wave" />
      <View style={styles.dialogueBubble}>
        <Text style={styles.kicker}>Bienvenue sur Grumm.</Text>
        <Text style={styles.dialogueTitle}>Ta culture, jour après jour.</Text>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onLogin} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Connexion</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onSignup} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Inscription</Text>
        </Pressable>
      </View>
    </>
  );
}

function LoginScene({
  email,
  error,
  isSubmitting,
  onForgotPassword,
  onSignup,
  onSubmit,
  password,
  setEmail,
  setPassword,
}: {
  email: string;
  error: string | null;
  isSubmitting: boolean;
  onForgotPassword: () => void;
  onSignup: () => void;
  onSubmit: () => void;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
}) {
  return (
    <>
      <Dialogue>Heureux de te revoir.</Dialogue>
      <View style={styles.answerZone}>
        <Field icon={<AtSign color={appTheme.color.muted} size={18} strokeWidth={2.15} />}>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={appTheme.color.muted}
            style={styles.input}
            textContentType="emailAddress"
            value={email}
          />
        </Field>

        <Field icon={<Lock color={appTheme.color.muted} size={18} strokeWidth={2.15} />}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            onSubmitEditing={onSubmit}
            placeholder="Mot de passe"
            placeholderTextColor={appTheme.color.muted}
            returnKeyType="done"
            secureTextEntry
            style={styles.input}
            textContentType="password"
            value={password}
          />
        </Field>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable disabled={isSubmitting} onPress={onSubmit} style={[styles.primaryButton, isSubmitting && styles.disabled]}>
          <Text style={styles.primaryButtonText}>{isSubmitting ? "Connexion..." : "Connexion"}</Text>
        </Pressable>

        <View style={styles.inlineLinks}>
          <Pressable accessibilityRole="link" onPress={onForgotPassword} style={styles.textButton}>
            <Text style={styles.textButtonText}>Mot de passe oublié ?</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onSignup} style={styles.textButton}>
            <Text style={styles.textButtonText}>Créer un compte</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

function SignupScene({
  currentStepIndex,
  dailyGoal,
  email,
  error,
  isSubmitting,
  learningGoal,
  onNext,
  password,
  passwordChecks,
  passwordConfirmation,
  setDailyGoal,
  setEmail,
  setLearningGoal,
  setPassword,
  setPasswordConfirmation,
  setUsername,
  signupStep,
  username,
}: {
  currentStepIndex: number;
  dailyGoal: number;
  email: string;
  error: string | null;
  isSubmitting: boolean;
  learningGoal: LearningGoal;
  onNext: () => void;
  password: string;
  passwordChecks: { isValid: boolean; label: string }[];
  passwordConfirmation: string;
  setDailyGoal: (value: number) => void;
  setEmail: (value: string) => void;
  setLearningGoal: (value: LearningGoal) => void;
  setPassword: (value: string) => void;
  setPasswordConfirmation: (value: string) => void;
  setUsername: (value: string) => void;
  signupStep: SignupStep;
  username: string;
}) {
  const isFinalStep = signupStep === "confirmation";

  return (
    <>
      <ProgressDots currentStepIndex={currentStepIndex} />

      {signupStep === "username" ? (
        <>
          <Dialogue>{"Comment veux-tu que je t'appelle ?"}</Dialogue>
          <View style={styles.answerZone}>
            <Field icon={<UserRound color={appTheme.color.muted} size={18} strokeWidth={2.15} />}>
              <TextInput
                autoCapitalize="none"
                autoComplete="username"
                onChangeText={setUsername}
                placeholder="Ton pseudo"
                placeholderTextColor={appTheme.color.muted}
                style={styles.input}
                textContentType="username"
                value={username}
              />
            </Field>
          </View>
        </>
      ) : null}

      {signupStep === "level" ? (
        <>
          <Dialogue>{"Quel niveau te correspond le mieux aujourd'hui ?"}</Dialogue>
          <View style={styles.answerZone}>
            {levelOptions.map((option) => (
              <ChoiceButton
                isSelected={learningGoal === option.value}
                key={option.value}
                label={option.label}
                onPress={() => setLearningGoal(option.value)}
              />
            ))}
          </View>
        </>
      ) : null}

      {signupStep === "dailyGoal" ? (
        <>
          <Dialogue>Combien de découvertes aimerais-tu lire chaque jour ?</Dialogue>
          <View style={styles.answerZone}>
            {dailyGoalOptions.map((option) => (
              <ChoiceButton
                isSelected={dailyGoal === option.value}
                key={option.value}
                label={option.label}
                onPress={() => setDailyGoal(option.value)}
              />
            ))}
          </View>
        </>
      ) : null}

      {signupStep === "email" ? (
        <>
          <Dialogue>Il me faut maintenant ton adresse email.</Dialogue>
          <View style={styles.answerZone}>
            <Field icon={<AtSign color={appTheme.color.muted} size={18} strokeWidth={2.15} />}>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="Ton email"
                placeholderTextColor={appTheme.color.muted}
                style={styles.input}
                textContentType="emailAddress"
                value={email}
              />
            </Field>
          </View>
        </>
      ) : null}

      {signupStep === "password" ? (
        <>
          <Dialogue>Choisis un mot de passe solide pour protéger ton compte.</Dialogue>
          <View style={styles.answerZone}>
            <Field icon={<Lock color={appTheme.color.muted} size={18} strokeWidth={2.15} />}>
              <TextInput
                autoCapitalize="none"
                onChangeText={setPassword}
                placeholder="Mot de passe"
                placeholderTextColor={appTheme.color.muted}
                secureTextEntry
                style={styles.input}
                textContentType="newPassword"
                value={password}
              />
            </Field>
            <View style={styles.checklist}>
              {passwordChecks.map((check) => (
                <View key={check.label} style={styles.checkItem}>
                  <View style={[styles.checkIcon, check.isValid && styles.checkIconActive]}>
                    {check.isValid ? <Check color="#ffffff" size={11} strokeWidth={2.5} /> : null}
                  </View>
                  <Text style={[styles.checkText, check.isValid && styles.checkTextActive]}>{check.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}

      {signupStep === "confirmation" ? (
        <>
          <Dialogue>Une dernière vérification.</Dialogue>
          <View style={styles.answerZone}>
            <Field icon={<Lock color={appTheme.color.muted} size={18} strokeWidth={2.15} />}>
              <TextInput
                autoCapitalize="none"
                onChangeText={setPasswordConfirmation}
                onSubmitEditing={onNext}
                placeholder="Confirmer le mot de passe"
                placeholderTextColor={appTheme.color.muted}
                returnKeyType="done"
                secureTextEntry
                style={styles.input}
                textContentType="newPassword"
                value={passwordConfirmation}
              />
            </Field>
          </View>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable disabled={isSubmitting} onPress={onNext} style={[styles.primaryButton, isSubmitting && styles.disabled]}>
        <Text style={styles.primaryButtonText}>{isSubmitting ? "Création..." : isFinalStep ? "Créer mon compte" : "Continuer"}</Text>
      </Pressable>
    </>
  );
}

function Dialogue({ children }: { children: ReactNode }) {
  return (
    <View style={styles.dialogueBubble}>
      <Text style={styles.dialogueText}>{children}</Text>
    </View>
  );
}

function ProgressDots({ currentStepIndex }: { currentStepIndex: number }) {
  return (
    <View style={styles.progressRow}>
      {signupSteps.map((step, index) => (
        <View key={step} style={[styles.progressDot, index <= currentStepIndex ? styles.progressDotActive : null]} />
      ))}
    </View>
  );
}

function ChoiceButton({ isSelected, label, onPress }: { isSelected: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.choice, isSelected && styles.choiceActive]}
    >
      <Text style={[styles.choiceText, isSelected && styles.choiceTextActive]}>{label}</Text>
      {isSelected ? <Check color="#ffffff" size={17} strokeWidth={2.35} /> : null}
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

function GrummFigure({ large = false, mood }: { large?: boolean; mood: GrummMood }) {
  const [floatValue] = useState(() => new Animated.Value(0));
  const [happyValue] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatValue, { duration: 1500, toValue: 1, useNativeDriver: true }),
        Animated.timing(floatValue, { duration: 1500, toValue: 0, useNativeDriver: true }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [floatValue]);

  useEffect(() => {
    if (mood !== "happy") {
      happyValue.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.timing(happyValue, { duration: 130, toValue: 1, useNativeDriver: true }),
      Animated.timing(happyValue, { duration: 220, toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [happyValue, mood]);

  const translateY = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const happyScale = happyValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.055],
  });

  return (
    <View style={[styles.grummWrap, large && styles.grummWrapLarge]}>
      <View style={[styles.grummHalo, mood === "happy" && styles.grummHaloHappy]} />
      <Animated.View style={{ transform: [{ translateY }, { scale: happyScale }] }}>
        <Image
          alt=""
          resizeMode="contain"
          source={grummImages[mood]}
          style={[styles.grummImage, large && styles.grummImageLarge]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    width: "100%",
  },
  answerZone: {
    gap: 11,
    width: "100%",
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 5,
    minHeight: 34,
  },
  backText: {
    color: appTheme.color.ink,
    fontSize: 13,
    fontWeight: appTheme.weight.bold,
  },
  background: {
    flex: 1,
  },
  checkIcon: {
    alignItems: "center",
    backgroundColor: withAlpha(appTheme.color.ink, 0.13),
    borderRadius: appTheme.radius.pill,
    height: 18,
    justifyContent: "center",
    width: 18,
  },
  checkIconActive: {
    backgroundColor: appTheme.color.green,
  },
  checkItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  checkText: {
    color: appTheme.color.muted,
    fontSize: 13,
    fontWeight: appTheme.weight.semibold,
  },
  checkTextActive: {
    color: appTheme.color.ink,
  },
  checklist: {
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  choice: {
    alignItems: "center",
    backgroundColor: withAlpha("#ffffff", 0.52),
    borderColor: withAlpha(appTheme.color.ink, 0.1),
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  choiceActive: {
    backgroundColor: appTheme.color.ink,
    borderColor: appTheme.color.ink,
  },
  choiceText: {
    color: appTheme.color.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: appTheme.weight.bold,
    lineHeight: 19,
    paddingRight: 12,
  },
  choiceTextActive: {
    color: "#ffffff",
  },
  content: {
    flexGrow: 1,
    padding: appTheme.space.lg,
  },
  dialogueBubble: {
    alignSelf: "center",
    backgroundColor: withAlpha("#ffffff", 0.58),
    borderColor: withAlpha("#ffffff", 0.72),
    borderRadius: 28,
    borderWidth: 1,
    maxWidth: 340,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: appTheme.color.ink,
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  dialogueText: {
    color: appTheme.color.ink,
    fontSize: 23,
    fontWeight: appTheme.weight.bold,
    letterSpacing: 0,
    lineHeight: 29,
    textAlign: "center",
  },
  dialogueTitle: {
    color: appTheme.color.ink,
    fontSize: 25,
    fontWeight: appTheme.weight.bold,
    letterSpacing: 0,
    lineHeight: 30,
    textAlign: "center",
  },
  disabled: {
    opacity: 0.58,
  },
  error: {
    alignSelf: "stretch",
    backgroundColor: withAlpha(appTheme.color.danger, 0.1),
    borderColor: withAlpha(appTheme.color.danger, 0.18),
    borderRadius: appTheme.radius.control,
    borderWidth: 1,
    color: appTheme.color.danger,
    fontSize: 13,
    fontWeight: appTheme.weight.semibold,
    lineHeight: 18,
    padding: 12,
    textAlign: "center",
  },
  field: {
    alignItems: "center",
    backgroundColor: withAlpha("#ffffff", 0.6),
    borderColor: withAlpha(appTheme.color.ink, 0.1),
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 15,
  },
  grummHalo: {
    backgroundColor: withAlpha(appTheme.color.teal, 0.14),
    borderRadius: appTheme.radius.pill,
    height: 190,
    position: "absolute",
    top: 36,
    width: 190,
  },
  grummHaloHappy: {
    backgroundColor: withAlpha(appTheme.color.yellow, 0.22),
  },
  grummImage: {
    height: 218,
    width: 218,
  },
  grummImageLarge: {
    height: 250,
    width: 250,
  },
  grummWrap: {
    alignItems: "center",
    alignSelf: "center",
    height: 246,
    justifyContent: "center",
    width: 270,
  },
  grummWrapLarge: {
    height: 276,
    width: 300,
  },
  halo: {
    borderRadius: appTheme.radius.pill,
    position: "absolute",
  },
  haloBottom: {
    backgroundColor: withAlpha(appTheme.color.violet, 0.12),
    bottom: -90,
    height: 260,
    left: -100,
    width: 260,
  },
  haloTop: {
    backgroundColor: withAlpha(appTheme.color.teal, 0.14),
    height: 280,
    right: -110,
    top: -90,
    width: 280,
  },
  inlineLinks: {
    alignItems: "center",
    gap: 2,
  },
  input: {
    color: appTheme.color.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: appTheme.weight.semibold,
    minHeight: 55,
  },
  keyboard: {
    flex: 1,
  },
  kicker: {
    color: appTheme.color.teal,
    fontSize: 12,
    fontWeight: appTheme.weight.bold,
    marginBottom: 4,
    textAlign: "center",
    textTransform: "uppercase",
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: appTheme.color.ink,
    borderRadius: 22,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: appTheme.weight.bold,
  },
  progressDot: {
    backgroundColor: withAlpha(appTheme.color.ink, 0.12),
    borderRadius: appTheme.radius.pill,
    flex: 1,
    height: 5,
  },
  progressDotActive: {
    backgroundColor: appTheme.color.teal,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    width: "100%",
  },
  safeArea: {
    flex: 1,
  },
  scene: {
    alignItems: "center",
    flex: 1,
    gap: 18,
    justifyContent: "space-between",
    minHeight: 720,
    width: "100%",
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: withAlpha("#ffffff", 0.55),
    borderColor: withAlpha(appTheme.color.ink, 0.1),
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: appTheme.color.ink,
    fontSize: 15,
    fontWeight: appTheme.weight.bold,
  },
  swipeBackWrapper: {
    flex: 1,
    width: "100%",
  },
  textButton: {
    alignItems: "center",
    minHeight: 34,
    justifyContent: "center",
  },
  textButtonText: {
    color: appTheme.color.ink,
    fontSize: 14,
    fontWeight: appTheme.weight.bold,
  },
  topSpacer: {
    height: 16,
  },
});
