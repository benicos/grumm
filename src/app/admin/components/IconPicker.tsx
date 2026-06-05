"use client";

import { useMemo, useState } from "react";
import { normalizeThemeIconName, themeIconCategories } from "@/lib/icons";
import ThemeIcon from "../../components/ThemeIcon";

type IconPickerProps = {
  accent?: string;
  help?: string;
  label: string;
  onChange: (value: string) => void;
  value?: string | null;
};

export default function IconPicker({
  accent = "#465fff",
  help,
  label,
  onChange,
  value,
}: IconPickerProps) {
  const [query, setQuery] = useState("");
  const selectedIcon = normalizeThemeIconName(value);
  const filteredCategories = useMemo(() => {
    const search = query.trim().toLowerCase();

    if (!search) {
      return themeIconCategories;
    }

    return themeIconCategories
      .map((category) => ({
        ...category,
        options: category.options.filter((option) =>
          [category.label, option.name, option.component, ...option.keywords]
            .join(" ")
            .toLowerCase()
            .includes(search),
        ),
      }))
      .filter((category) => category.options.length > 0);
  }, [query]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {help ? <p className="mt-1 text-xs leading-5 text-gray-500">{help}</p> : null}
        </div>
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-gray-200 bg-gray-50 shadow-sm" style={{ color: accent }}>
          <ThemeIcon iconName={selectedIcon} className="h-7 w-7" />
        </div>
      </div>

      <input
        aria-label="Rechercher une icône"
        className="mt-4 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#465fff]/50 focus:ring-4 focus:ring-[#465fff]/10"
        placeholder="Rechercher une icône"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4">
        <div className="grid gap-5">
          {filteredCategories.map((category) => (
            <div key={category.label}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                {category.label}
              </p>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-10">
                {category.options.map((option) => {
                  const selected = selectedIcon === option.name;

                  return (
                    <button
                      key={`${category.label}-${option.name}`}
                      type="button"
                      aria-label={`Choisir l'icône ${option.name}`}
                      onClick={() => onChange(option.name)}
                      className={`grid h-11 w-11 place-items-center rounded-xl border transition ${
                        selected
                          ? "border-[#465fff] bg-[#f5f7ff] text-[#1d2adf] shadow-[0_10px_28px_rgba(70,95,255,0.16)]"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <ThemeIcon iconName={option.name} className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
              Aucune icône ne correspond à cette recherche.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

