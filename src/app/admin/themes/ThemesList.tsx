"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteAdminCategory, getAdminCategories } from "@/lib/admin";
import type { AdminCategory } from "@/lib/admin";
import { getToneBackground } from "@/lib/gradients";
import { hasPermission } from "@/lib/roles";
import { useAuth } from "../../auth/AuthProvider";
import {
  AdminButton,
  AdminLoadingRows,
  AdminMessage,
  AdminPageHeader,
  AdminPager,
  AdminPanel,
  AdminSearch,
  AdminTableEmpty,
} from "../components";

export default function ThemesList() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManageThemes = hasPermission(profile, "themes.manage");

  async function loadThemes(nextPage = page) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getAdminCategories({
        page: nextPage,
        pageSize,
        query,
      });
      setCategories(result.items);
      setTotal(result.total);
      setPage(result.page);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les themes.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!canManageThemes) {
      return;
    }

    let isMounted = true;

    async function loadInitialThemes() {
      try {
        const result = await getAdminCategories({ page, pageSize, query });

        if (!isMounted) {
          return;
        }

        setCategories(result.items);
        setTotal(result.total);
        setPage(result.page);
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les themes.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialThemes();

    return () => {
      isMounted = false;
    };
  }, [canManageThemes, page, pageSize, query]);

  async function removeCategory(category: AdminCategory) {
    if (!window.confirm(`Supprimer le theme "${category.name}" ?`)) {
      return;
    }

    setIsBusy(true);
    const result = await deleteAdminCategory(category.id);
    setIsBusy(false);
    setMessage(result.ok ? result.message : null);
    setError(result.ok ? null : result.message);
    await loadThemes();
  }

  if (!canManageThemes) {
    return (
      <AdminPageHeader
        eyebrow="Themes"
        title="Acces reserve"
        description="La gestion des themes est reservee aux administrateurs."
      />
    );
  }

  return (
    <>
      <AdminPageHeader
        eyebrow="Taxonomie"
        title="Themes"
        description="Liste paginee des themes, couleurs et gradients."
        action={
          <Link
            href="/admin/themes/create"
            className="rounded-md bg-amber-300 px-4 py-2 text-sm font-extrabold text-slate-950 hover:bg-amber-200"
          >
            Creer un theme
          </Link>
        }
      />

      <AdminMessage message={message} tone="success" />
      <AdminMessage message={error} tone="error" />

      <AdminPanel>
        <div className="grid gap-3 border-b border-slate-800 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <AdminSearch
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
              setIsLoading(true);
            }}
            placeholder="Rechercher un theme..."
          />
          <span className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-slate-300">
            {total} themes
          </span>
        </div>

        {isLoading ? (
          <AdminLoadingRows />
        ) : categories.length > 0 ? (
          <div className="grid gap-4 p-4 lg:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => {
              const background = getToneBackground(category.tone);

              return (
                <div
                  key={category.id}
                  className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900"
                >
                  <div
                    className={`h-24 ${background.className}`}
                    style={background.style}
                  />
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-extrabold text-white">
                          {category.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {category.slug}
                        </p>
                      </div>
                      <span
                        className="h-7 w-7 rounded-full border border-slate-700"
                        style={{ backgroundColor: category.accent_color }}
                      />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Link
                        href={`/admin/themes/${category.id}`}
                        className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-extrabold text-slate-200 hover:bg-slate-800"
                      >
                        Editer
                      </Link>
                      <AdminButton
                        tone="danger"
                        disabled={isBusy}
                        onClick={() => removeCategory(category)}
                      >
                        Supprimer
                      </AdminButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4">
            <AdminTableEmpty label="Aucun theme trouve." />
          </div>
        )}

        <AdminPager
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(nextPage) => {
            setPage(nextPage);
            setIsLoading(true);
          }}
        />
      </AdminPanel>
    </>
  );
}
