"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/roles";
import { useAuth } from "../auth/AuthProvider";
import GradeIcon from "./GradeIcon";

type NavbarProps = {
  fixed?: boolean;
};

const desktopLinks = [
  { label: "D\u00e9couvrir", href: "/decouvrir" },
  { label: "Explorer", href: "/theme" },
  { label: "Quizz", href: "/quizz" },
];

const mobileLinks = [
  ...desktopLinks,
  { label: "Contact", href: "/contact" },
];

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="m6 6 12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Zm7.3 7.8c-.8-3.2-3.7-5.5-7.3-5.5S5.5 16.8 4.7 20"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M10 6H6.8A1.8 1.8 0 0 0 5 7.8v8.4A1.8 1.8 0 0 0 6.8 18H10M14 8l4 4-4 4M18 12H9"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function Navbar({ fixed = false }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { displayName, isAuthenticated, isLoading, profile, refreshUser } =
    useAuth();
  const router = useRouter();
  const loginHref = "/login";
  const adminLink = { label: "Admin", href: "/admin" };
  const visibleDesktopLinks = canAccessAdmin(profile)
    ? [...desktopLinks, adminLink]
    : desktopLinks;
  const visibleMobileLinks = canAccessAdmin(profile)
    ? [...mobileLinks, adminLink]
    : mobileLinks;

  const handleSignOut = async () => {
    await signOut();
    await refreshUser();
    setIsOpen(false);
    router.replace("/");
  };

  const accountControl = isAuthenticated ? (
    <div className="hidden items-center gap-2 sm:flex">
      <Link
        href="/profil"
        className="flex max-w-[190px] items-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-white transition hover:bg-white/5"
        title={profile?.gradeName ?? undefined}
      >
        <span className="truncate">{displayName ?? "Profil"}</span>
        <GradeIcon
          badge={profile?.gradeBadge}
          className="h-4 w-4 shrink-0 text-[#ffd166]"
        />
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        aria-label="D\u00e9connexion"
        title="D\u00e9connexion"
        className="grid h-10 w-10 place-items-center rounded-md border border-white/10 text-white/72 transition hover:border-white/20 hover:text-white"
      >
        <LogoutIcon />
      </button>
    </div>
  ) : (
    <Link
      href={loginHref}
      aria-label="Connexion"
      className="grid h-10 w-10 place-items-center rounded-md p-2.5 text-white transition hover:bg-white/5"
    >
      <LoginIcon />
    </Link>
  );

  return (
    <header className={`${fixed ? "fixed" : "sticky"} inset-x-0 top-0 z-50`}>
      <div className="mx-auto max-w-[1180px] px-6 lg:px-8">
        <div className="relative flex items-center justify-between py-6">
          <Link
            href="/"
            className="flex items-center gap-3 text-[1.1rem] font-extrabold tracking-[-0.04em] text-white"
            onClick={() => setIsOpen(false)}
          >
            <span className="grid h-[38px] w-[38px] place-items-center rounded-[14px] bg-gradient-to-br from-[#ffd166] to-[#6ae3c0] font-black text-[#06111d] shadow-[0_10px_30px_rgba(255,209,102,0.25)]">
              G
            </span>
            <span>Grumm.</span>
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-12 font-bold uppercase lg:flex">
            {visibleDesktopLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm/6 font-semibold text-white opacity-70 underline-offset-4 decoration-[0.15rem] transition hover:opacity-100 hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {!isLoading && accountControl}

            <button
              type="button"
              aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={isOpen}
              onClick={() => setIsOpen((current) => !current)}
              className="grid h-10 w-10 place-items-center rounded-md p-2.5 text-white transition hover:bg-white/5 lg:hidden"
            >
              {isOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-gray-900 p-6 shadow-2xl sm:max-w-sm sm:ring-1 sm:ring-white/10 lg:hidden">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="flex items-center gap-3 text-[1.1rem] font-extrabold tracking-[-0.04em] text-white"
                onClick={() => setIsOpen(false)}
              >
                <span className="grid h-[38px] w-[38px] place-items-center rounded-[14px] bg-gradient-to-br from-[#ffd166] to-[#6ae3c0] font-black text-[#06111d] shadow-[0_10px_30px_rgba(255,209,102,0.25)]">
                  G
                </span>
                <span>Grumm.</span>
              </Link>

              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() => setIsOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-gray-200"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-white/10">
                <div className="space-y-2 py-6">
                  {visibleMobileLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-white/5"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="py-6">
                  {isAuthenticated ? (
                    <div className="space-y-2">
                      <Link
                        href="/profil"
                        onClick={() => setIsOpen(false)}
                        className="-mx-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-base/7 font-semibold text-white hover:bg-white/5"
                      >
                        <GradeIcon
                          badge={profile?.gradeBadge}
                          className="h-5 w-5 shrink-0 text-[#ffd166]"
                        />
                        <span>{displayName ?? "Profil"}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={handleSignOut}
                        aria-label="D\u00e9connexion"
                        title="D\u00e9connexion"
                        className="-mx-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base/7 font-semibold text-white/72 hover:bg-white/5 hover:text-white"
                      >
                        <LogoutIcon />
                        <span>{"D\u00e9connexion"}</span>
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={loginHref}
                      onClick={() => setIsOpen(false)}
                      className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-white hover:bg-white/5"
                    >
                      Connexion <span aria-hidden="true">-&gt;</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
