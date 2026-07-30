// src/lib/slug.ts
export function buildProductPath(input: { _id: string; slug?: string }) {
  const safeSlug = (input.slug || "item").trim().toLowerCase();
  return `/products/${safeSlug}-${input._id}`;
}

/** Accepts "nikon-af-s-50mm-f18g-lens-68a6b73b848a8513b126c885" and returns the id */
export function extractIdFromSlugPath(slugId: string) {
  const uuidMatch = slugId.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
  );
  if (uuidMatch?.[1]) return uuidMatch[1];

  const lastDash = slugId.lastIndexOf("-");
  if (lastDash === -1) return slugId;
  return slugId.slice(lastDash + 1);
}
