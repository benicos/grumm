export const ADMIN_COLUMN_STORAGE_KEY = "grumm.admin.columns.v1";

export const adminEntityColumns = {
  facts: {
    label: "Faits",
    columns: [
      { key: "fact", label: "Fait" },
      { key: "theme", label: "Thème" },
      { key: "status", label: "Statut" },
      { key: "source", label: "Source" },
    ],
  },
  themes: {
    label: "Thèmes",
    columns: [
      { key: "theme", label: "Thème" },
      { key: "slug", label: "Slug" },
      { key: "accent", label: "Accent" },
      { key: "updated", label: "Mise à jour" },
    ],
  },
  users: {
    label: "Utilisateurs",
    columns: [
      { key: "user", label: "Utilisateur" },
      { key: "role", label: "Rôle" },
      { key: "goal", label: "Objectif quotidien" },
      { key: "created", label: "Inscription" },
    ],
  },
  roles: {
    label: "Rôles",
    columns: [
      { key: "role", label: "Rôle" },
      { key: "type", label: "Type" },
      { key: "permissions", label: "Permissions" },
      { key: "updated", label: "Mise à jour" },
    ],
  },
  grades: {
    label: "Grades",
    columns: [
      { key: "grade", label: "Grade" },
      { key: "goals", label: "Objectifs requis" },
      { key: "order", label: "Ordre" },
      { key: "type", label: "Type" },
    ],
  },
} as const;

export type AdminEntityKey = keyof typeof adminEntityColumns;
export type AdminColumnPreferences = Partial<Record<AdminEntityKey, string[]>>;

export function getDefaultColumnKeys(entity: AdminEntityKey): string[] {
  return adminEntityColumns[entity].columns.map(
    (column): string => column.key,
  );
}

export function readColumnPreferences(): AdminColumnPreferences {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(ADMIN_COLUMN_STORAGE_KEY) ?? "{}",
    ) as AdminColumnPreferences;

    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeColumnPreferences(preferences: AdminColumnPreferences) {
  window.localStorage.setItem(
    ADMIN_COLUMN_STORAGE_KEY,
    JSON.stringify(preferences),
  );
  window.dispatchEvent(new Event("admin-columns-updated"));
}
