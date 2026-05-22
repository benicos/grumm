"use client";

import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  GraduationCap,
  House,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Tags,
  Users,
  X,
} from "lucide-react";
import { notFound, usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/lib/auth";
import {
  canAccessAdmin,
  getRoleLabel,
  hasPermission,
  type PermissionKey,
} from "@/lib/roles";
import { useAuth } from "../auth/AuthProvider";

const navigation = [
  {
    heading: "Menu",
    items: [
      {
        href: "/admin",
        icon: LayoutDashboard,
        label: "Tableau de bord",
        permission: "admin.access",
      },
      {
        href: "/admin/facts",
        icon: BookOpen,
        label: "Faits",
        permission: "facts.create",
      },
      {
        href: "/admin/themes",
        icon: Tags,
        label: "Thèmes",
        permission: "themes.manage",
      },
    ],
  },
  {
    heading: "Accès",
    items: [
      {
        href: "/admin/users",
        icon: Users,
        label: "Utilisateurs",
        permission: "users.manage",
      },
      {
        href: "/admin/roles",
        icon: ShieldCheck,
        label: "Rôles",
        permission: "roles.manage",
      },
      {
        href: "/admin/grades",
        icon: GraduationCap,
        label: "Grades",
        permission: "grades.manage",
      },
      {
        href: "/admin/settings",
        icon: Settings,
        label: "Paramètres",
        permission: "admin.access",
      },
    ],
  },
] as const;

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}

function AdminLoadingShell() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <aside className="fixed inset-y-0 left-0 hidden w-[290px] border-r border-gray-200 bg-white p-6 xl:block">
        <div className="h-9 w-36 animate-pulse rounded-lg bg-gray-100" />
        <div className="mt-11 space-y-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-11 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </aside>
      <div className="xl:pl-[290px]">
        <div className="h-20 border-b border-gray-200 bg-white" />
        <main className="p-6">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-gray-100" />
        </main>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { displayName, isAuthenticated, isLoading, profile, refreshUser } =
    useAuth();
  const roleLabel = getRoleLabel(profile?.role, profile?.roleName);
  const sections = navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        hasPermission(profile, item.permission as PermissionKey),
      ),
    }))
    .filter((section) => section.items.length > 0);

  async function handleSignOut() {
    await signOut();
    await refreshUser();
    router.replace("/");
  }

  if (isLoading) {
    return <AdminLoadingShell />;
  }

  if (!isAuthenticated || !canAccessAdmin(profile)) {
    notFound();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center px-6">
        <Link href="/admin" className="flex items-center gap-3 text-gray-800">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#465fff] text-sm font-bold text-white">
            GR
          </span>
          <span>
            <span className="block text-lg font-semibold leading-none">Admin</span>
            <span className="mt-1 block text-xs text-gray-500">Espace Grumm</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 pb-6">
        {sections.map((section) => (
          <div key={section.heading} className="mb-7">
            <p className="mb-3 px-3 text-xs font-medium uppercase text-gray-400">
              {section.heading}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isCurrentPath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                      active
                        ? "bg-[#ecf3ff] text-[#465fff]"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="m-4 rounded-2xl bg-gray-100 p-4">
        <p className="truncate text-sm font-semibold text-gray-800">
          {displayName ?? "Compte administrateur"}
        </p>
        <p className="mt-1 text-xs text-gray-500">{roleLabel}</p>
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          <House className="h-4 w-4" aria-hidden="true" />
          Retour au site
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[290px] border-r border-gray-200 bg-white xl:block">
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Fermer le menu admin"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-gray-900/45"
          />
          <aside className="relative h-full w-[290px] border-r border-gray-200 bg-white shadow-2xl">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="xl:pl-[290px]">
        <header className="sticky top-0 z-40 h-20 border-b border-gray-200 bg-white">
          <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                aria-label={open ? "Fermer le menu admin" : "Ouvrir le menu admin"}
                onClick={() => setOpen((current) => !current)}
                className="grid h-11 w-11 place-items-center rounded-lg border border-gray-200 text-gray-700 xl:hidden"
              >
                {open ? (
                  <X className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Menu className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
              <label className="relative hidden w-full max-w-[430px] lg:block">
                <span className="sr-only">Rechercher dans l’administration</span>
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <input
                  placeholder="Rechercher ou saisir une commande..."
                  className="h-12 w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-12 pr-20 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-[#465fff]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500">
                  Ctrl K
                </span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 sm:block">
                {roleLabel}
              </span>
              <button
                type="button"
                className="flex h-11 items-center gap-3 rounded-full border border-gray-200 bg-white pl-1 pr-3 text-left"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#ecf3ff] text-sm font-semibold text-[#465fff]">
                  {(displayName ?? "A").slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate text-sm font-medium text-gray-700 sm:block">
                  {displayName ?? "Admin"}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-screen-2xl p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
