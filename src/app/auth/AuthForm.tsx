"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { appRoutes, dailyGoalConfig } from "@/config/app";
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
  Record<"username" | "email" | "password" | "dailyGoal", string>
>;

const signupSteps: SignupStep[] = [
  "username",
  "learningGoal",
  "dailyGoal",
  "credentials",
];

const dailyGoalOptions = [3, 5, 10, 15] as const;

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
  const [dailyGoal, setDailyGoal] = useState(dailyGoalConfig.defaultGoal);
  const [password, setPassword] = useState("");
  const [signupStep, setSignupStep] = useState<SignupStep>("username");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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
    return getLegacyNextParam() ?? consumeAuthRedirect("/profile");
  }

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/profile");
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
      (!Number.isInteger(dailyGoal) ||
        dailyGoal < dailyGoalConfig.minGoal ||
        dailyGoal > dailyGoalConfig.maxGoal)
    ) {
      nextFieldErrors.dailyGoal = `Choisis un objectif entre ${dailyGoalConfig.minGoal} et ${dailyGoalConfig.maxGoal}.`;
    }

    if (step === "credentials") {
      if (!email.trim() || !validateEmail()) {
        nextFieldErrors.email = "Entre une adresse email valide.";
      }

      if (!isPasswordValid(password)) {
        nextFieldErrors.password = passwordValidationMessage;
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
        setMessage(result.message);
      }
      return;
    }

    if (result.requiresEmailConfirmation) {
      setMessage(result.message ?? "Compte cree. Confirme ton email.");
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
            {dailyGoalOptions.map((option) => {
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
          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/42">
              Personnaliser
            </span>
            <input
              value={dailyGoal}
              onChange={(event) => {
                setDailyGoal(Number(event.target.value));
                setFieldError("dailyGoal");
              }}
              type="number"
              min={dailyGoalConfig.minGoal}
              max={dailyGoalConfig.maxGoal}
              className="mt-2 w-full rounded-[16px] border border-white/10 bg-white/[0.055] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166] focus:bg-white/[0.08]"
            />
          </label>
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
          <input
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldError("password");
            }}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-2 w-full rounded-[16px] border border-white/10 bg-white/[0.055] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166] focus:bg-white/[0.08]"
            placeholder="Mot de passe securise"
          />
          <PasswordRuleChecklist password={password} />
          <FieldError message={fieldErrors.password} />
        </label>
      </>
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
        <p className="mt-5 rounded-md border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {message}
        </p>
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
        {isLogin ? "Pas encore de compte ?" : "Deja un compte ?"}{" "}
        <button
          type="button"
          onClick={() => router.push(isLogin ? "/register" : "/login")}
          className="font-bold text-[#ffd166] underline-offset-4 hover:underline"
        >
          {isLogin ? "Inscription" : "Connexion"}
        </button>
      </p>
    </form>
  );
}
