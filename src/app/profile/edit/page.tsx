"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  getUserProfileSummary,
  resetUserFactViews,
  updateProfileEmail,
  updateProfilePassword,
  updateProfileSettings,
} from "@/lib/profile";
import type { ProfileField, UserProfileSummary } from "@/lib/profile";
import {
  type LearningGoal,
  learningGoalOptions,
} from "@/lib/learning";
import { isPasswordValid, passwordValidationMessage } from "@/lib/password";
import RequireAuth from "../../auth/RequireAuth";
import { useAuth } from "../../auth/AuthProvider";
import { AppState } from "../../components/AppState";
import { premiumPrimaryCtaClassName } from "../../components/buttonStyles";
import HeroBackground from "../../components/HeroBackground";
import Navbar from "../../components/Navbar";
import PasswordRuleChecklist from "../../auth/PasswordRuleChecklist";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

type FieldErrors = Partial<Record<ProfileField, string>>;

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

function EditSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-48 animate-pulse rounded-lg border border-white/10 bg-white/[0.055]"
        />
      ))}
    </div>
  );
}

function SettingsForms({
  onChanged,
  profile,
}: {
  onChanged: () => Promise<void>;
  profile: UserProfileSummary;
}) {
  const { refreshUser } = useAuth();
  const [username, setUsername] = useState(profile.username ?? "");
  const [dailyGoal, setDailyGoal] = useState(String(profile.dailyGoal));
  const [learningGoal, setLearningGoal] = useState<LearningGoal>(
    profile.learningGoal,
  );
  const [email, setEmail] = useState(profile.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  async function handleResult(
    result:
      | Awaited<ReturnType<typeof updateProfileSettings>>
      | Awaited<ReturnType<typeof updateProfileEmail>>
      | Awaited<ReturnType<typeof updateProfilePassword>>
      | Awaited<ReturnType<typeof resetUserFactViews>>,
  ) {
    if (!result.ok) {
      setErrors({ [result.field]: result.message });
      setMessage(null);
      return;
    }

    setErrors({});
    setMessage(result.message);
    await refreshUser();
    await onChanged();
  }

  async function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting("email");
    await handleResult(await updateProfileEmail(email));
    setIsSubmitting(null);
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    if (!currentPassword) {
      setErrors({ currentPassword: "Entre ton mot de passe actuel." });
      return;
    }

    if (!isPasswordValid(password)) {
      setErrors({ password: passwordValidationMessage });
      return;
    }

    if (password !== passwordConfirmation) {
      setErrors({
        passwordConfirmation:
          "Les deux nouveaux mots de passe ne correspondent pas.",
      });
      return;
    }

    setIsSubmitting("password");
    const result = await updateProfilePassword({
      currentPassword,
      newPassword: password,
    });
    await handleResult(result);
    if (result.ok) {
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
    }
    setIsSubmitting(null);
  }

  async function resetViews() {
    const confirmed = window.confirm(
                "Réinitialiser tes vues uniques ? Tes likes et sauvegardes seront conservés.",
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting("reset");
    await handleResult(await resetUserFactViews());
    setIsSubmitting(null);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form
        onSubmit={submitSettings}
        className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl"
      >
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
          Identite
        </p>
        <label className="mt-5 block">
          <span className="text-sm font-semibold text-white/72">Pseudo</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166]"
            minLength={3}
            maxLength={24}
            required
          />
          <FieldError message={errors.username} />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-white/72">
            Objectif quotidien
          </span>
          <input
            value={dailyGoal}
            onChange={(event) => setDailyGoal(event.target.value)}
            className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166]"
            inputMode="numeric"
            max={100}
            min={1}
            required
            type="number"
          />
          <FieldError message={errors.dailyGoal} />
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-white/72">
            Objectif culturel
          </legend>
          <div className="mt-2 grid gap-2">
            {learningGoalOptions.map((option) => {
              const selected = learningGoal === option.value;

              return (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-md border px-4 py-3 transition ${
                    selected
                      ? "border-white/24 bg-white/[0.09]"
                      : "border-white/10 bg-black/20 hover:border-white/18"
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
                      <span className="mt-1 block text-xs leading-5 text-white/45">
                        {option.description}
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <FieldError message={errors.learningGoal} />
        </fieldset>

        <button
          type="submit"
          disabled={isSubmitting === "settings"}
          className={`${premiumPrimaryCtaClassName} mt-5 w-full`}
        >
                  {isSubmitting === "settings" ? "Mise à jour..." : "Mettre à jour"}
        </button>
      </form>

      <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
          Sécurité
        </p>
        <form onSubmit={submitEmail} className="mt-5">
          <label className="block">
            <span className="text-sm font-semibold text-white/72">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166]"
              required
              type="email"
            />
            <FieldError message={errors.email} />
          </label>
          <button
            type="submit"
            disabled={isSubmitting === "email"}
            className="mt-3 w-full rounded-md border border-white/10 px-4 py-3 text-sm font-bold text-white/72 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Changer l&apos;email
          </button>
        </form>

        <form onSubmit={submitPassword} className="mt-5">
          <label className="block">
            <span className="text-sm font-semibold text-white/72">
              Mot de passe actuel
            </span>
            <input
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166]"
              placeholder="Mot de passe actuel"
              type="password"
            />
            <FieldError message={errors.currentPassword} />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-white/72">
              Nouveau mot de passe
            </span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166]"
              minLength={8}
              placeholder="Mot de passe securise"
              type="password"
            />
            <PasswordRuleChecklist password={password} />
            <FieldError message={errors.password} />
          </label>

          <label className="mt-4 block">
            <span className="text-sm font-semibold text-white/72">
              Confirmer le nouveau mot de passe
            </span>
            <input
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              autoComplete="new-password"
              className="mt-2 w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#ffd166]"
              minLength={8}
              placeholder="Confirmation"
              type="password"
            />
            <FieldError message={errors.passwordConfirmation} />
          </label>
          <button
            type="submit"
            disabled={
              isSubmitting === "password" ||
              currentPassword.length === 0 ||
              password.length === 0 ||
              passwordConfirmation.length === 0
            }
            className="mt-3 w-full rounded-md border border-white/10 px-4 py-3 text-sm font-bold text-white/72 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Changer le mot de passe
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.055] p-5 shadow-2xl backdrop-blur-xl lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ffd166]">
              Vues uniques
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/62">
              Reinitialise uniquement tes faits vus. Tes likes, sauvegardes et
              anciens objectifs realises restent conserves.
            </p>
          </div>
          <button
            type="button"
            onClick={resetViews}
            disabled={isSubmitting === "reset"}
            className="rounded-md border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reinitialiser mes vues
          </button>
        </div>
      </section>

      {message && (
        <p className="rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 lg:col-span-2">
          {message}
        </p>
      )}
      <FieldError message={errors.global} />
    </div>
  );
}

function ProfileEditContent() {
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reloadProfile = useCallback(async () => {
    setError(null);

    try {
      const summary = await getUserProfileSummary();
      setProfile(summary);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Le profil est indisponible.",
      );
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialProfile() {
      try {
        const summary = await getUserProfileSummary();

        if (isMounted) {
          setProfile(summary);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Le profil est indisponible.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  if (error && !isLoading) {
    return (
      <AppState
        eyebrow="Profil"
        title="Impossible de charger tes parametres."
        description={error}
        primaryHref="/profil"
        primaryLabel="Retour profil"
        secondaryHref="/decouvrir"
        secondaryLabel="Retour à Découvrir"
      />
    );
  }

  return (
    <div
      className={`${inter.className} relative min-h-screen overflow-x-hidden bg-[#132338] text-white`}
    >
      <HeroBackground />
      <Navbar />
      <main className="relative z-10 mx-auto w-full max-w-[980px] px-6 py-12 sm:py-16 lg:px-8">
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="w-fit rounded-full border border-white/10 bg-white/[0.055] px-3 py-1 text-sm/6 font-semibold text-white/62 backdrop-blur-xl">
              Paramètres
            </p>
            <h1 className="mt-5 text-[clamp(2.2rem,5vw,4.5rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-white">
              Modifier le profil
            </h1>
          </div>
          <Link
            href="/profil"
            className="rounded-md border border-white/10 px-4 py-3 text-sm font-bold text-white/72 transition hover:border-white/20 hover:text-white"
          >
            Retour profil
          </Link>
        </section>

        {isLoading || !profile ? (
          <EditSkeleton />
        ) : (
          <SettingsForms
            key={`${profile.username}:${profile.email}:${profile.dailyGoal}`}
            onChanged={reloadProfile}
            profile={profile}
          />
        )}
      </main>
    </div>
  );
}

export default function ProfileEditPage() {
  return (
    <RequireAuth>
      <ProfileEditContent />
    </RequireAuth>
  );
}
