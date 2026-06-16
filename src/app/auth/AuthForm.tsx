"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { appRoutes, dailyGoalConfig, signupDailyGoalOptions } from "@/config/app";
import { trackAnalyticsEvent } from "@/lib/analytics/web";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth";
import { consumeAuthRedirect, getLegacyNextParam } from "@/lib/authRedirect";
import {
  DEFAULT_LEARNING_GOAL,
  type LearningGoal,
  learningGoalOptions,
} from "@/lib/learning";
import {
  getUsernameValidationMessage,
  normalizeUsername,
} from "@/lib/slug";
import { isPasswordValid, passwordValidationMessage } from "@/lib/password";
import { premiumPrimaryCtaClassName } from "../components/buttonStyles";
import PasswordRuleChecklist from "./PasswordRuleChecklist";
import { useAuth } from "./AuthProvider";

type AuthFormProps = {
  mode: "login" | "signup";
};

type SignupStep = "username" | "learningGoal" | "dailyGoal" | "credentials";

type FieldErrors = Partial<
  Record<
    "username" | "email" | "password" | "passwordConfirmation" | "dailyGoal",
    string
  >
>;

const signupSteps: SignupStep[] = [
  "username",
  "learningGoal",
  "dailyGoal",
  "credentials",
];

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <span className="mt-2 block rounded-md border border-red-300/15 bg-red-500/10 px-3 py-2 text-xs font-semibold leading-5 text-red-100">
      {message}
    </span>
  );
}

function StepIndicator({ currentStep }: { currentStep: SignupStep }) {
  const currentIndex = signupSteps.indexOf(currentStep);

  return (
    <div className="mt-6 flex items-center gap-2" aria-label="Progression">
      {signupSteps.map((step, index) => (
        <span
          key={step}
          className={`h-1.5 flex-1 rounded-full transition ${
            index <= currentIndex ? "bg-[#f4ead5]" : "bg-white/12"
          }`}
        />
      ))}
    </div>
  );
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [learningGoal, setLearningGoal] =
    useState<LearningGoal>(DEFAULT_LEARNING_GOAL);
  const [dailyGoal, setDailyGoal] = useState<number>(
    dailyGoalConfig.defaultGoal,
  );
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);
  const [signupStep, setSignupStep] = useState<SignupStep>("username");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isAwaitingEmailConfirmation, setIsAwaitingEmailConfirmation] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLogin = mode === "login";
  const normalizedUsername = useMemo(
    () => normalizeUsername(username),
    [username],
  );
  const usernameValidationMessage = isLogin
    ? null
    : getUsernameValidationMessage(normalizedUsername);

  function getRedirectTarget() {
    return getLegacyNextParam() ?? consumeAuthRedirect("/profil");
  }

  function getAuthModeSwitchPath() {
    const target = getLegacyNextParam();
    const authPath = isLogin ? "/register" : "/login";

    return target
      ? `${authPath}?redirect=${encodeURIComponent(target)}`
      : authPath;
  }

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getRedirectTarget());
    }
  }, [isAuthenticated, isLoading, router]);

  function setFieldError(field: keyof FieldErrors, value?: string) {
    setFieldErrors((current) => ({ ...current, [field]: value }));
  }

  function validateEmail() {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function validateSignupStep(step: SignupStep) {
    const nextFieldErrors: FieldErrors = {};

    if (step === "username" && usernameValidationMessage) {
      nextFieldErrors.username = usernameValidationMessage;
    }

    if (
      step === "dailyGoal" &&
      !signupDailyGoalOptions.includes(
        dailyGoal as (typeof signupDailyGoalOptions)[number],
      )
    ) {
      nextFieldErrors.dailyGoal = "Choisis 5, 10, 20 ou 40 faits par jour.";
    }

    if (step === "credentials") {
      if (!email.trim() || !validateEmail()) {
        nextFieldErrors.email = "Entre une adresse email valide.";
      }

      if (!isPasswordValid(password)) {
        nextFieldErrors.password = passwordValidationMessage;
      }

      if (!passwordConfirmation) {
        nextFieldErrors.passwordConfirmation = "Confirme ton mot de passe.";
      } else if (password !== passwordConfirmation) {
        nextFieldErrors.passwordConfirmation =
          "Les deux mots de passe ne correspondent pas.";
      }
    }

    setFieldErrors(nextFieldErrors);
    return Object.keys(nextFieldErrors).length === 0;
  }

  function goToNextSignupStep() {
    if (!validateSignupStep(signupStep)) {
      return;
    }

    const currentIndex = signupSteps.indexOf(signupStep);
    const nextStep = signupSteps[currentIndex + 1];

    if (nextStep) {
      setSignupStep(nextStep);
      setMessage(null);
    }
  }

  function goToPreviousSignupStep() {
    const currentIndex = signupSteps.indexOf(signupStep);
    const previousStep = signupSteps[currentIndex - 1];

    if (previousStep) {
      setSignupStep(previousStep);
      setMessage(null);
      setFieldErrors({});
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setMessageTone("error");

    if (!isLogin && signupStep !== "credentials") {
      goToNextSignupStep();
      return;
    }

    const nextFieldErrors: FieldErrors = {};

    if (!email.trim() || !validateEmail()) {
      nextFieldErrors.email = "Entre une adresse email valide.";
    }

    if (isLogin) {
      if (!password) {
        nextFieldErrors.password = "Entre ton mot de passe.";
      }
    } else if (!validateSignupStep("credentials")) {
      return;
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    const result = isLogin
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(
          email,
          password,
          normalizedUsername,
          learningGoal,
          dailyGoal,
        );

    setIsSubmitting(false);

    if (!result.ok) {
      if (result.field && result.field !== "global") {
        setFieldErrors({ [result.field]: result.message });
      } else {
        setMessageTone("error");
        setMessage(result.message);
      }
      return;
    }

    if (result.requiresEmailConfirmation) {
      setMessageTone("success");
      setMessage(
        result.message ??
          "Ton compte a bien été créé. Pour continuer, ouvre l'email de confirmation que nous venons de t'envoyer et clique sur le bouton de validation.",
      );
      setIsAwaitingEmailConfirmation(true);
      return;
    }

    await refreshUser();
    void trackAnalyticsEvent({
      eventName: isLogin ? "login_completed" : "signup_completed",
    });
    router.replace(getRedirectTarget());
  }

  function renderSignupStep() {
    if (signupStep === "username") {
      return (
        <label className="block">
          <span className="text-sm font-semibold text-white/72">
            Nom d&apos;utilisateur
          </span>
          <input
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setFieldError("username");
            }}
            autoComplete="username"
            required
            minLength={3}
            maxLength={24}
            className="mt-2 w-full rounded-[16px] border border-white/10 bg-white/[0.055] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166] focus:bg-white/[0.08]"
            placeholder="Nom d'utilisateur"
          />
          <span className="mt-2 block text-xs leading-5 text-white/45">
            Il sera normalise en{" "}
            <strong className="font-semibold text-white/70">
              {normalizedUsername || "nom_utilisateur"}
            </strong>
            .
          </span>
          <FieldError message={fieldErrors.username} />
        </label>
      );
    }

    if (signupStep === "learningGoal") {
      return (
        <fieldset className="block">
          <legend className="text-sm font-semibold text-white/72">
            Objectif culturel
          </legend>
          <div className="mt-2 grid gap-2">
            {learningGoalOptions.map((option) => {
              const selected = learningGoal === option.value;

              return (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-[16px] border px-4 py-3 transition ${
                    selected
                      ? "border-[#f4ead5]/55 bg-white/[0.105] shadow-[0_16px_45px_rgba(244,234,213,0.08)]"
                      : "border-white/10 bg-white/[0.045] hover:border-white/18 hover:bg-white/[0.07]"
                  }`}
                >
                  <span className="flex gap-3">
                    <input
                      checked={selected}
                      className="mt-1 h-4 w-4 accent-[#f4ead5]"
                      name="learning_goal"
                      onChange={() => setLearningGoal(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span>
                      <span className="block text-sm font-bold text-white">
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-white/50">
                        {option.description}
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    if (signupStep === "dailyGoal") {
      return (
        <fieldset className="block">
          <legend className="text-sm font-semibold text-white/72">
            Objectif quotidien
          </legend>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Choisis un rythme realiste. Tu pourras le modifier depuis ton profil.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {signupDailyGoalOptions.map((option) => {
              const selected = dailyGoal === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setDailyGoal(option);
                    setFieldError("dailyGoal");
                  }}
                  className={`rounded-[16px] border px-4 py-3 text-center transition ${
                    selected
                      ? "border-[#f4ead5]/55 bg-white/[0.105] text-white shadow-[0_16px_45px_rgba(244,234,213,0.08)]"
                      : "border-white/10 bg-white/[0.045] text-white/62 hover:border-white/18 hover:bg-white/[0.07]"
                  }`}
                >
                  <span className="block text-lg font-black">{option}</span>
                  <span className="text-xs font-semibold">faits / jour</span>
                </button>
              );
            })}
          </div>
          <FieldError message={fieldErrors.dailyGoal} />
        </fieldset>
      );
    }

    return (
      <>
        <label className="block">
          <span className="text-sm font-semibold text-white/72">Email</span>
          <input
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldError("email");
            }}
            type="email"
            autoComplete="email"
            required
            className="mt-2 w-full rounded-[16px] border border-white/10 bg-white/[0.055] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166] focus:bg-white/[0.08]"
            placeholder="adresse@mail.fr"
          />
          <FieldError message={fieldErrors.email} />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-white/72">
            Mot de passe
          </span>
          <div className="relative mt-2">
            <input
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setFieldError("password");
                setFieldError("passwordConfirmation");
              }}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-[16px] border border-white/10 bg-white/[0.055] px-4 py-3 pr-14 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166] focus:bg-white/[0.08]"
              placeholder="Mot de passe securise"
            />
            <button
              type="button"
              aria-label={
                showPassword
                  ? "Masquer le mot de passe"
                  : "Afficher le mot de passe"
              }
              onClick={() => setShowPassword((current) => !current)}
              className="absolute inset-y-0 right-2 my-auto grid h-10 w-10 place-items-center rounded-full text-white/58 transition hover:bg-white/10 hover:text-white"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <PasswordRuleChecklist password={password} />
          <FieldError message={fieldErrors.password} />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-white/72">
            Confirmer le mot de passe
          </span>
          <div className="relative mt-2">
            <input
              value={passwordConfirmation}
              onChange={(event) => {
                setPasswordConfirmation(event.target.value);
                setFieldError("passwordConfirmation");
              }}
              type={showPasswordConfirmation ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-[16px] border border-white/10 bg-white/[0.055] px-4 py-3 pr-14 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166] focus:bg-white/[0.08]"
              placeholder="Confirme le mot de passe"
            />
            <button
              type="button"
              aria-label={
                showPasswordConfirmation
                  ? "Masquer la confirmation du mot de passe"
                  : "Afficher la confirmation du mot de passe"
              }
              onClick={() =>
                setShowPasswordConfirmation((current) => !current)
              }
              className="absolute inset-y-0 right-2 my-auto grid h-10 w-10 place-items-center rounded-full text-white/58 transition hover:bg-white/10 hover:text-white"
            >
              {showPasswordConfirmation ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <FieldError message={fieldErrors.passwordConfirmation} />
        </label>
      </>
    );
  }

  if (!isLogin && isAwaitingEmailConfirmation) {
    return (
      <section className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/12 bg-[#07111f]/62 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl sm:p-7">
        <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#ffd166]/55 to-transparent" />
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#ffd166]/12 blur-3xl" />
        <div className="relative">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#ffd166] text-[#07111f] shadow-[0_18px_55px_rgba(255,209,102,0.22)]">
            <MailCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#ffd166]">
            Compte créé
          </p>
          <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.04em] text-white">
            Vérifie ton adresse email
          </h2>
          <p className="mt-4 text-sm font-semibold leading-6 text-white/72">
            {message}
          </p>
          <p className="mt-3 rounded-[16px] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm font-semibold leading-6 text-white/62">
            Pense à vérifier tes spams ou courriers indésirables si tu ne vois
            pas l&apos;email.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex w-full justify-center rounded-full border border-white/12 px-5 py-3 text-sm font-black text-white/72 transition hover:border-white/24 hover:text-white"
          >
            Retour à la connexion
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/12 bg-[#07111f]/62 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl sm:p-7"
    >
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#ffd166]/55 to-transparent" />
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#ffd166]/12 blur-3xl" />
      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ffd166]">
          Grumm.
        </p>
        <p className="mt-3 text-sm font-semibold leading-6 text-white/56">
          {isLogin
            ? "Retrouve tes sauvegardes, ta progression et ton rythme de lecture."
            : "Configure ton espace en quelques secondes, puis garde le fil de tes lectures."}
        </p>
        {!isLogin ? <StepIndicator currentStep={signupStep} /> : null}
      </div>

      <div className="relative mt-8 space-y-4">
        {isLogin ? (
          <>
            <label className="block">
              <span className="text-sm font-semibold text-white/72">Email</span>
              <input
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldError("email");
                }}
                type="email"
                autoComplete="email"
                required
                className="mt-2 w-full rounded-[16px] border border-white/10 bg-white/[0.055] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166] focus:bg-white/[0.08]"
                placeholder="adresse@mail.fr"
              />
              <FieldError message={fieldErrors.email} />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-white/72">
                Mot de passe
              </span>
              <input
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldError("password");
                }}
                type="password"
                autoComplete="current-password"
                required
                className="mt-2 w-full rounded-[16px] border border-white/10 bg-white/[0.055] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166] focus:bg-white/[0.08]"
                placeholder="Mot de passe"
              />
              <FieldError message={fieldErrors.password} />
            </label>
            <div className="text-right">
              <Link
                href={appRoutes.forgotPassword}
                className="text-xs font-bold text-[#ffd166] transition hover:text-white"
              >
                Mot de passe oublie ?
              </Link>
            </div>
          </>
        ) : (
          renderSignupStep()
        )}
      </div>

      {message && (
        messageTone === "success" ? (
          <div className="mt-5 rounded-[22px] border border-[#ffd166]/30 bg-[#ffd166]/12 px-4 py-4 text-white shadow-[0_18px_60px_rgba(255,209,102,0.14)]">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffd166] text-[#07111f]">
                <MailCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-lg font-black tracking-[-0.03em]">
                  Vérifie ta boîte mail
                </span>
                <span className="mt-1 block text-sm font-semibold leading-6 text-white/78">
                  {message}
                </span>
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-md border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {message}
          </p>
        )
      )}

      <div className="relative mt-6 flex gap-3">
        {!isLogin && signupStep !== "username" ? (
          <button
            type="button"
            onClick={goToPreviousSignupStep}
            className="rounded-full border border-white/12 px-5 py-3 text-sm font-bold text-white/70 transition hover:border-white/24 hover:text-white"
          >
            Retour
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${premiumPrimaryCtaClassName} flex-1`}
        >
          {isSubmitting
            ? "Chargement..."
            : isLogin
              ? "Se connecter"
              : signupStep === "credentials"
                ? "Creer mon compte"
                : "Continuer"}
        </button>
      </div>

      <p className="relative mt-5 text-center text-sm text-white/62">
            {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
        <button
          type="button"
          onClick={() => router.push(getAuthModeSwitchPath())}
          className="font-bold text-[#ffd166] underline-offset-4 hover:underline"
        >
          {isLogin ? "Inscription" : "Connexion"}
        </button>
      </p>
    </form>
  );
}
