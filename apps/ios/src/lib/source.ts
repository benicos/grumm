export function cleanFactSource(value?: string | null) {
  const text = value?.trim();

  if (!text) {
    return null;
  }

  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  if (
    normalized === "source non renseignee" ||
    normalized === "source: source non renseignee" ||
    normalized === "source : source non renseignee"
  ) {
    return null;
  }

  return text;
}
