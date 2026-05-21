export const COMMERCIAL_COLLABORATION_SLUG = "collaboration-commerciale";

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
