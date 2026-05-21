"use client";

import Link from "next/link";
import { notFound, usePathname, useRouter } from "next/navigation";
import { Inter } from "next/font/google";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { signOut } from "@/lib/auth";
import {
  canAccessAdmin,
  getRoleLabel,
  hasPermission,
  type PermissionKey,
} from "@/lib/roles";
import { useAuth } from "../auth/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const baseLinks = [
  { href: "/admin", label: "Tableau de bord", permission: "admin.access" },
  { href: "/admin/facts", label: "Faits", permission: "facts.create" },
  { href: "/admin/facts/pending", label: "Validation", permission: "facts.publish" },
  { href: "/admin/themes", label: "Thèmes", permission: "themes.manage" },
  { href: "/admin/users", label: "Utilisateurs", permission: "users.manage" },
  { href: "/admin/analytics", label: "Analytics", permission: "admin.access" },
  { href: "/admin/roles", label: "Rôles", permission: "roles.manage" },
  { href: "/admin/grades", label: "Grades", permission: "grades.manage" },
] as const;

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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { displayName, isAuthenticated, isLoading, profile, refreshUser } =
    useAuth();
  const role = profile?.role ?? "membre";
  const roleLabel = getRoleLabel(role, profile?.roleName);
  const canOpenAdmin = canAccessAdmin(profile);
  const navLinks = baseLinks.filter((link) =>
    hasPermission(profile, link.permission as PermissionKey),
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
    notFound();
  }

  if (!canOpenAdmin) {
    notFound();
  }

  return (
    <div className={`${inter.className} min-h-screen bg-[#0a0f1a] text-slate-100`}>
      <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-800 bg-slate-950 lg:block">
          <div className="flex h-full flex-col p-5">
            <Link href="/admin" className="flex items-center gap-3 font-extrabold">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-amber-300 text-slate-950">
                G
              </span>
              <span>Grumm Admin</span>
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
              <p className="mt-1 text-xs text-slate-400">{roleLabel}</p>
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
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0a0f1a]/92 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/admin"
                className="flex items-center gap-2 font-extrabold"
                onClick={() => setIsMobileNavOpen(false)}
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-amber-300 text-slate-950">
                  G
                </span>
                <span>Grumm Admin</span>
              </Link>
              <button
                type="button"
                aria-expanded={isMobileNavOpen}
                aria-label={isMobileNavOpen ? "Fermer la navigation admin" : "Ouvrir la navigation admin"}
                onClick={() => setIsMobileNavOpen((current) => !current)}
                className="grid h-10 w-10 place-items-center rounded-md border border-slate-700 bg-slate-900 text-slate-100"
              >
                {isMobileNavOpen ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
                {roleLabel}
              </span>
              <span className="text-xs font-bold text-slate-500">
                {navLinks.find((item) => pathname === item.href)?.label ?? "Admin"}
              </span>
            </div>
            {isMobileNavOpen && (
              <nav className="mt-3 grid gap-2 rounded-lg border border-slate-800 bg-slate-950 p-2 shadow-2xl">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileNavOpen(false)}
                    className={`rounded-md px-3 py-2 text-sm font-bold ${
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
                  onClick={() => setIsMobileNavOpen(false)}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200"
                >
                  Site public
                </Link>
              </nav>
            )}
          </header>

          <main className="mx-auto w-full max-w-[1440px] min-w-0 px-4 py-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </section>
      </div>
    </div>
  );
}
