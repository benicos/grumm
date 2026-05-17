"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth";
import { consumeAuthRedirect, getLegacyNextParam } from "@/lib/authRedirect";
import {
  getUsernameValidationMessage,
  normalizeUsername,
} from "@/lib/slug";
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
        "Le mot de passe doit contenir au moins 6 caracteres.";
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
      setMessage(result.message ?? "Compte cree. Confirme ton email.");
      return;
    }

    await refreshUser();
    router.replace(getRedirectTarget());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
          Velora
        </p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-white">
          {isLogin ? "Connexion" : "Inscription"}
        </h1>
      </div>

      <div className="mt-8 space-y-4">
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
              className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166]"
              placeholder="curieux42"
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
            className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166]"
            placeholder="toi@exemple.fr"
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
              setFieldErrors((current) => ({
                ...current,
                password: undefined,
              }));
            }}
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={6}
            className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166]"
            placeholder="6 caracteres minimum"
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
        className="mt-6 w-full rounded-md bg-[#ffd166] px-4 py-3 text-sm font-extrabold text-[#07111f] transition hover:bg-[#ffe08f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? "Chargement..."
          : isLogin
            ? "Se connecter"
            : "Creer mon compte"}
      </button>

      <p className="mt-5 text-center text-sm text-white/62">
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
