"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { appRoutes } from "@/config/app";
import { trackAnalyticsEvent } from "@/lib/analytics/web";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth";
import { consumeAuthRedirect, getLegacyNextParam } from "@/lib/authRedirect";
import {
  getUsernameValidationMessage,
  normalizeUsername,
} from "@/lib/slug";
import { premiumPrimaryCtaClassName } from "../components/buttonStyles";
import { useAuth } from "./AuthProvider";

type AuthFormProps = {
  mode: "login" | "signup";
};

type FieldErrors = Partial<Record<"username" | "email" | "password", string>>;

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

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLogin = mode === "login";
  const normalizedUsername = useMemo(() => normalizeUsername(username), [username]);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setFieldErrors({});

    const nextFieldErrors: FieldErrors = {};

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextFieldErrors.email = "Entre une adresse email valide.";
    }

    if (password.length < 6) {
      nextFieldErrors.password =
        "Le mot de passe doit contenir au moins 6 caractères.";
    }

    if (!isLogin && usernameValidationMessage) {
      nextFieldErrors.username = usernameValidationMessage;
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setIsSubmitting(false);
      setFieldErrors(nextFieldErrors);
      return;
    }

    const result = isLogin
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password, normalizedUsername);

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
      setMessage(result.message ?? "Compte créé. Confirme ton email.");
      return;
    }

    await refreshUser();
    void trackAnalyticsEvent({
      eventName: isLogin ? "login_completed" : "signup_completed",
    });
    router.replace(getRedirectTarget());
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
            : "Un compte suffit pour synchroniser tes lectures et garder les faits qui comptent."}
        </p>
      </div>

      <div className="relative mt-8 space-y-4">
        {!isLogin && (
          <label className="block">
            <span className="text-sm font-semibold text-white/72">
              Nom d&apos;utilisateur
            </span>
            <input
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setFieldErrors((current) => ({
                  ...current,
                  username: undefined,
                }));
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
        )}

        <label className="block">
          <span className="text-sm font-semibold text-white/72">Email</span>
          <input
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
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
          <span className="flex items-center justify-between gap-4 text-sm font-semibold text-white/72">
            Mot de passe
            {isLogin ? (
              <Link
                href={appRoutes.forgotPassword}
                className="text-xs font-bold text-[#ffd166] transition hover:text-white"
              >
                Mot de passe oublié ?
              </Link>
            ) : null}
          </span>
          <input
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((current) => ({
                ...current,
                password: undefined,
              }));
            }}
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={6}
            className="mt-2 w-full rounded-[16px] border border-white/10 bg-white/[0.055] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166] focus:bg-white/[0.08]"
            placeholder="6 caractères minimum"
          />
          <FieldError message={fieldErrors.password} />
        </label>
      </div>

      {message && (
        <p className="mt-5 rounded-md border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`${premiumPrimaryCtaClassName} relative mt-6 w-full`}
      >
        {isSubmitting
          ? "Chargement..."
          : isLogin
            ? "Se connecter"
            : "Créer mon compte"}
      </button>

      <p className="relative mt-5 text-center text-sm text-white/62">
        {isLogin ? "Pas encore de compte ?" : "Deja un compte ?"}{" "}
        <button
          type="button"
        onClick={() =>
            router.push(
              isLogin
                ? "/register"
                : "/login",
            )
          }
          className="font-bold text-[#ffd166] underline-offset-4 hover:underline"
        >
          {isLogin ? "Inscription" : "Connexion"}
        </button>
      </p>
    </form>
  );
}
