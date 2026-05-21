"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { requestPasswordReset, updatePasswordAfterReset } from "@/lib/auth";
import { appRoutes } from "@/config/app";
import { premiumPrimaryCtaClassName } from "../components/buttonStyles";
import { useAuth } from "./AuthProvider";

function Message({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: React.ReactNode;
}) {
  return (
    <p
      className={`mt-5 rounded-md border px-4 py-3 text-sm font-semibold leading-6 ${
        tone === "success"
          ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
          : "border-red-300/20 bg-red-500/10 text-red-100"
      }`}
    >
      {children}
    </p>
  );
}

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const result = await requestPasswordReset(email);
    setIsSubmitting(false);
    setMessage(result.message ?? null);
    setMessageTone(result.ok ? "success" : "error");
  }

  return (
    <form
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
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          required
          className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166]"
          placeholder="mail@exemple.fr"
        />
      </label>

      {message && <Message tone={messageTone}>{message}</Message>}

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
        Choisis un mot de passe d&apos;au moins 8 caractères pour retrouver ton espace.
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
            placeholder="8 caractères minimum"
          />
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

      {message && <Message tone={messageTone}>{message}</Message>}

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
