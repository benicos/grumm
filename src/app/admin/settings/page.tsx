"use client";

import { RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  adminEntityColumns,
  getDefaultColumnKeys,
  readColumnPreferences,
  writeColumnPreferences,
  type AdminColumnPreferences,
  type AdminEntityKey,
} from "../columns";
import {
  AdminButton,
  AdminCard,
  AdminNotice,
  AdminPageHeading,
} from "../ui";

const entities = Object.entries(adminEntityColumns) as [
  AdminEntityKey,
  (typeof adminEntityColumns)[AdminEntityKey],
][];

function getSelectedColumns(
  preferences: AdminColumnPreferences,
  entity: AdminEntityKey,
) {
  const available = getDefaultColumnKeys(entity);
  const configured = preferences[entity]?.filter((key) =>
    available.includes(key),
  );

  return configured && configured.length > 0 ? configured : available;
}

export default function AdminSettingsPage() {
  const [preferences, setPreferences] = useState<AdminColumnPreferences>({});
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setPreferences(readColumnPreferences());
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  function toggleColumn(entity: AdminEntityKey, key: string) {
    setMessage(null);
    setPreferences((current) => {
      const selected = getSelectedColumns(current, entity);
      const next = selected.includes(key)
        ? selected.filter((column) => column !== key)
        : [...selected, key];

      return {
        ...current,
        [entity]: next.length > 0 ? next : selected,
      };
    });
  }

  function savePreferences() {
    writeColumnPreferences(preferences);
    setMessage("Les colonnes affichées ont été enregistrées.");
  }

  function resetPreferences() {
    setPreferences({});
    writeColumnPreferences({});
    setMessage("Les colonnes par défaut ont été restaurées.");
  }

  return (
    <>
      <AdminPageHeading
        current="Paramètres"
        title="Paramètres"
        description="Configure les colonnes visibles dans les tableaux d’administration."
        action={
          <AdminButton icon={Save} onClick={savePreferences}>
            Enregistrer
          </AdminButton>
        }
      />

      <AdminNotice message={message} />

      <AdminCard className="p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-gray-800">
              Aperçu des tableaux
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Sélectionne les champs affichés pour chaque entité. La colonne
              Actions reste toujours visible et les colonnes inconnues sont
              ignorées automatiquement.
            </p>
          </div>
          <button
            type="button"
            onClick={resetPreferences}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Réinitialiser
          </button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {entities.map(([entity, definition]) => {
            const selected = getSelectedColumns(preferences, entity);

            return (
              <section
                key={entity}
                className="rounded-2xl border border-gray-200 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-gray-800">
                    {definition.label}
                  </h3>
                  <span className="rounded-full bg-[#ecf3ff] px-2.5 py-1 text-xs font-medium text-[#465fff]">
                    {selected.length} champ{selected.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {definition.columns.map((column) => {
                    const checked = selected.includes(column.key);
                    const isLastSelected = checked && selected.length === 1;

                    return (
                      <label
                        key={column.key}
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isLastSelected}
                          onChange={() => toggleColumn(entity, column.key)}
                          className="h-4 w-4 accent-[#465fff] disabled:opacity-50"
                        />
                        <span>{column.label}</span>
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </AdminCard>
    </>
  );
}
