// src/lib/slug.ts
export function buildProductPath(input: { _id: string; slug?: string }) {
  const safeSlug = (input.slug || "item").trim().toLowerCase();
  return `/products/${safeSlug}-${input._id}`;
}

/** Accepts "nikon-af-s-50mm-f18g-lens-68a6b73b848a8513b126c885" and returns the id */
export function extractIdFromSlugPath(slugId: string) {
  // the id is everything after the last hyphen
  const lastDash = slugId.lastIndexOf("-");
  if (lastDash === -1) return slugId; // fallback (no-dash safety)
  return slugId.slice(lastDash + 1);
}
