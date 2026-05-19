"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import { signOut } from "@/lib/auth";
import { canAccessAdmin, ROLE_LABELS } from "@/lib/roles";
import { useAuth } from "../auth/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const baseLinks = [
  { href: "/admin", label: "Dashboard", roles: ["redacteur", "administrateur"] },
  { href: "/admin/facts", label: "Faits", roles: ["redacteur", "administrateur"] },
  { href: "/admin/facts/pending", label: "Validation", roles: ["administrateur"] },
  { href: "/admin/themes", label: "Themes", roles: ["administrateur"] },
  { href: "/admin/users", label: "Utilisateurs", roles: ["administrateur"] },
  { href: "/admin/roles", label: "Roles", roles: ["administrateur"] },
] as const;

function AdminGate({
  actionHref,
  actionLabel,
  description,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  description: string;
  title: string;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-[#0a0f1a] px-6 py-10 text-slate-100`}>
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center">
        <section className="w-full rounded-lg border border-slate-800 bg-slate-950 p-6 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
            Admin Velora
          </p>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={actionHref}
              className="rounded-md bg-amber-300 px-4 py-2 text-sm font-extrabold text-slate-950"
            >
              {actionLabel}
            </Link>
            <Link
              href="/discover"
              className="rounded-md border border-slate-800 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-slate-900"
            >
              Retour au site
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminShellSkeleton() {
  return (
    <div className={`${inter.className} min-h-screen bg-[#0a0f1a] text-slate-100`}>
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-800 bg-slate-950 p-5 lg:block">
          <div className="h-9 w-32 animate-pulse rounded bg-slate-800" />
          <div className="mt-10 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded bg-slate-900" />
            ))}
          </div>
        </aside>
        <main className="p-6 lg:p-8">
          <div className="h-10 w-64 animate-pulse rounded bg-slate-900" />
          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-900" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { displayName, isAuthenticated, isLoading, profile, refreshUser } =
    useAuth();
  const role = profile?.role ?? "membre";
  const canOpenAdmin = canAccessAdmin(role);
  const navLinks = baseLinks.filter((link) =>
    (link.roles as readonly string[]).includes(role),
  );

  async function handleLogout() {
    await signOut();
    await refreshUser();
    router.replace("/");
  }

  if (isLoading) {
    return <AdminShellSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <AdminGate
        title="Connexion requise."
        description="Connecte-toi avec un compte redacteur ou administrateur pour ouvrir cet espace."
        actionHref="/login"
        actionLabel="Se connecter"
      />
    );
  }

  if (!canOpenAdmin) {
    return (
      <AdminGate
        title="Acces reserve."
        description="Ton role actuel ne donne pas acces a l'administration."
        actionHref="/profile"
        actionLabel="Voir mon profil"
      />
    );
  }

  return (
    <div className={`${inter.className} min-h-screen bg-[#0a0f1a] text-slate-100`}>
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-800 bg-slate-950 lg:block">
          <div className="flex h-full flex-col p-5">
            <Link href="/admin" className="flex items-center gap-3 font-extrabold">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-300 text-slate-950">
                V
              </span>
              <span>Velora Admin</span>
            </Link>

            <nav className="mt-8 space-y-1">
              {navLinks.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" &&
                    pathname.startsWith(`${item.href}/`) &&
                    !(
                      item.href === "/admin/facts" &&
                      pathname.startsWith("/admin/facts/pending")
                    ));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-md px-3 py-2 text-sm font-bold transition ${
                      isActive
                        ? "bg-amber-300 text-slate-950"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <p className="truncate text-sm font-bold">{displayName ?? "Compte"}</p>
              <p className="mt-1 text-xs text-slate-400">{ROLE_LABELS[role]}</p>
              <div className="mt-4 grid gap-2">
                <Link
                  href="/discover"
                  className="rounded-md border border-slate-700 px-3 py-2 text-center text-xs font-bold text-slate-200 hover:bg-slate-800"
                >
                  Retour site
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md border border-red-400/30 px-3 py-2 text-xs font-bold text-red-100 hover:bg-red-500/10"
                >
                  Deconnexion
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0a0f1a]/92 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/admin" className="font-extrabold">
                Velora Admin
              </Link>
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
                {ROLE_LABELS[role]}
              </span>
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold ${
                    pathname === item.href
                      ? "bg-amber-300 text-slate-950"
                      : "bg-slate-900 text-slate-200"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/discover"
                className="whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200"
              >
                Site
              </Link>
            </nav>
          </header>

          <main className="mx-auto w-full max-w-[1440px] px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </section>
      </div>
    </div>
  );
}
