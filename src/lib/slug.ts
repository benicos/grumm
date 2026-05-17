export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

export function getUsernameValidationMessage(value: string) {
  if (!value) {
    return "Choisis un nom d'utilisateur.";
  }

  if (value.length < 3) {
    return "Le nom d'utilisateur doit contenir au moins 3 caracteres.";
  }

  if (value.length > 24) {
    return "Le nom d'utilisateur doit contenir 24 caracteres maximum.";
  }

  if (!/^[a-z0-9_]+$/.test(value)) {
    return "Utilise uniquement des lettres, chiffres ou underscores.";
  }

  return null;
}
