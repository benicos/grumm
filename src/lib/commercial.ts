export const COMMERCIAL_COLLABORATION_SLUG = "collaboration-commerciale";

type RoleLike = string | null | undefined;

type CommercialFactLike = {
  categorySlug?: string | null;
};

type CommercialCategoryLike = {
  slug?: string | null;
};

export function isCommercialCollaborationSlug(slug: string | null | undefined) {
  return slug?.trim().toLowerCase() === COMMERCIAL_COLLABORATION_SLUG;
}

export function isCommercialCollaborationFact(fact: CommercialFactLike) {
  return isCommercialCollaborationSlug(fact.categorySlug);
}

export function filterCommercialCollaborationFacts<T extends CommercialFactLike>(
  facts: T[],
) {
  return facts.filter((fact) => !isCommercialCollaborationFact(fact));
}

export function filterCommercialCollaborationCategories<
  T extends CommercialCategoryLike,
>(categories: T[]) {
  return categories.filter(
    (category) => !isCommercialCollaborationSlug(category.slug),
  );
}

export function canAccessCommercialCollaboration(role: RoleLike) {
  const normalized = role
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  return (
    normalized === "administrateur" ||
    normalized === "admin" ||
    normalized === "redacteur" ||
    normalized === "redacteur-en-chef" ||
    normalized === "editor" ||
    normalized === "chief-editor"
  );
}
