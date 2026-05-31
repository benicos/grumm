export const SYSTEM_USER_ROLES = [
  "membre",
  "redacteur",
  "administrateur",
] as const;

export const USER_ROLES = SYSTEM_USER_ROLES;

export type UserRole = string;

export const ROLE_LABELS: Record<string, string> = {
  administrateur: "Administrateur",
  membre: "Membre",
  redacteur: "Redacteur",
};

export const PERMISSIONS = [
  "facts.read",
  "profile.manage",
  "interactions.manage",
  "admin.access",
  "facts.create",
  "facts.manage_own",
  "facts.manage",
  "facts.publish",
  "themes.manage",
  "users.manage",
  "users.delete",
  "roles.manage",
  "grades.manage",
  "quizzes.manage",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "admin.access": "Accès tableau de bord admin",
  "facts.create": "Créer des faits",
  "facts.manage": "Gérer tous les faits",
  "facts.manage_own": "Gérer ses faits",
  "facts.publish": "Publier / rejeter des faits",
  "facts.read": "Lire les faits",
  "grades.manage": "Gérer les grades",
  "interactions.manage": "Likes et enregistrements",
  "profile.manage": "Gérer son profil",
  "quizzes.manage": "Gérer les questions quiz",
  "roles.manage": "Gérer les rôles",
  "themes.manage": "Gérer les thèmes",
  "users.delete": "Supprimer des utilisateurs",
  "users.manage": "Gérer les utilisateurs",
};

export const SYSTEM_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  administrateur: [
    "facts.read",
    "profile.manage",
    "interactions.manage",
    "admin.access",
    "facts.create",
    "facts.manage",
    "facts.publish",
    "themes.manage",
    "users.manage",
    "users.delete",
    "roles.manage",
    "grades.manage",
    "quizzes.manage",
  ],
  membre: ["facts.read", "profile.manage", "interactions.manage"],
  redacteur: [
    "facts.read",
    "profile.manage",
    "interactions.manage",
    "admin.access",
    "facts.create",
    "facts.manage_own",
  ],
};

export type RoleLike = {
  permissions?: readonly string[] | null;
  role?: string | null;
} | null | undefined;

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && value.trim().length > 0;
}

export function getRoleLabel(role?: UserRole | null, fallback?: string | null) {
  if (!role) {
    return fallback ?? "Membre";
  }

  return fallback ?? ROLE_LABELS[role] ?? role;
}

export function getDefaultRolePermissions(role?: UserRole | null) {
  return role ? SYSTEM_ROLE_PERMISSIONS[role] ?? [] : [];
}

function getRoleAndPermissions(value?: UserRole | RoleLike | null) {
  if (typeof value === "string") {
    return {
      permissions: getDefaultRolePermissions(value),
      role: value,
    };
  }

  const role = value?.role ?? null;

  return {
    permissions: value?.permissions ?? getDefaultRolePermissions(role),
    role,
  };
}

export function hasPermission(
  value: UserRole | RoleLike | null | undefined,
  permission: PermissionKey,
) {
  const { permissions, role } = getRoleAndPermissions(value);

  return role === "administrateur" || permissions.includes(permission);
}

export function canAccessAdmin(value?: UserRole | RoleLike | null) {
  return hasPermission(value, "admin.access");
}

export function isAdmin(value?: UserRole | RoleLike | null) {
  const { role } = getRoleAndPermissions(value);

  return role === "administrateur";
}
