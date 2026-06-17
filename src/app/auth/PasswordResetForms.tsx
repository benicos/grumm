"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { requestPasswordReset, updatePasswordAfterReset } from "@/lib/auth";
import { appRoutes } from "@/config/app";
import { isPasswordValid, passwordValidationMessage } from "@/lib/password";
import { premiumPrimaryCtaClassName } from "../components/buttonStyles";
import StatusMessage from "../components/StatusMessage";
import PasswordRuleChecklist from "./PasswordRuleChecklist";
import { useAuth } from "./AuthProvider";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setEmailError(null);

    const result = await requestPasswordReset(email);
    setIsSubmitting(false);
    setMessage(result.message ?? null);
    setMessageTone(result.ok ? "success" : "error");

    if (!result.ok && result.field === "email") {
      setEmailError(result.message);
    }
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl"
    >
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
        Accès
      </p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-white">
        Mot de passe oublié
      </h1>
      <p className="mt-3 text-sm leading-6 text-white/58">
        Entre l&apos;email de ton compte. Si un compte existe, tu recevras un lien pour choisir un nouveau mot de passe.
      </p>

      <label className="mt-7 block">
        <span className="text-sm font-semibold text-white/72">Email</span>
        <input
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setEmailError(null);
            setMessage(null);
          }}
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(emailError)}
          className={`mt-2 w-full rounded-[16px] border bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166] ${
            emailError
              ? "border-red-300/65 bg-red-500/[0.08] shadow-[0_0_0_1px_rgba(252,165,165,0.22)]"
              : "border-white/10"
          }`}
          placeholder="mail@exemple.fr"
        />
      </label>

      {message ? (
        <StatusMessage
          className="mt-5"
          tone={messageTone}
          title={
            messageTone === "success"
              ? "Email envoyé si le compte existe"
              : "Envoi impossible"
          }
        >
          {message}
        </StatusMessage>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`${premiumPrimaryCtaClassName} mt-6 w-full`}
      >
        {isSubmitting ? "Envoi..." : "Recevoir le lien"}
      </button>
    </form>
  );
}

export function PasswordUpdateForm() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password !== confirmation) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      setMessageTone("error");
      return;
    }

    if (!isPasswordValid(password)) {
      setMessage(passwordValidationMessage);
      setMessageTone("error");
      return;
    }

    setIsSubmitting(true);
    const result = await updatePasswordAfterReset(password);
    setIsSubmitting(false);

    if (!result.ok) {
      setMessage(result.message);
      setMessageTone("error");
      return;
    }

    setMessage(result.message ?? "Mot de passe mis à jour.");
    setMessageTone("success");
    await refreshUser();
    window.setTimeout(() => router.replace(appRoutes.profile), 900);
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl"
    >
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
        Sécurité
      </p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-white">
        Nouveau mot de passe
      </h1>
      <p className="mt-3 text-sm leading-6 text-white/58">
        Choisis un mot de passe sécurisé pour retrouver ton espace.
      </p>

      <div className="mt-7 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-white/72">
            Mot de passe
          </span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166]"
            placeholder="Mot de passe sécurisé"
          />
          <PasswordRuleChecklist password={password} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-white/72">
            Confirmation
          </span>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166]"
            placeholder="Confirme le mot de passe"
          />
        </label>
      </div>

      {message ? (
        <StatusMessage
          className="mt-5"
          tone={messageTone}
          title={
            messageTone === "success"
              ? "Mot de passe modifié"
              : "Mise à jour impossible"
          }
        >
          {message}
        </StatusMessage>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`${premiumPrimaryCtaClassName} mt-6 w-full`}
      >
        {isSubmitting ? "Mise à jour..." : "Mettre à jour"}
      </button>
    </form>
  );
}
