export const USER_ROLES = ["membre", "redacteur", "administrateur"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  administrateur: "Administrateur",
  redacteur: "Rédacteur",
  membre: "Membre",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function canAccessAdmin(role?: UserRole | null) {
  return role === "administrateur" || role === "redacteur";
}

export function isAdmin(role?: UserRole | null) {
  return role === "administrateur";
}
