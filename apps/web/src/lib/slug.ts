// src/lib/slug.ts
export function buildProductPath(input: { _id: string; slug?: string }) {
  const safeSlug = (input.slug || "item").trim().toLowerCase();
  return `/products/${safeSlug}-${input._id}`;
}

/**
 * Accepts either a legacy ObjectId suffix or the current UUID suffix.
 * UUIDs contain hyphens, so splitting on the final hyphen would corrupt them.
 */
export function extractIdFromSlugPath(slugId: string) {
  const uuid = slugId.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  if (uuid) return uuid[1];

  const legacyObjectId = slugId.match(/([0-9a-f]{24})$/i);
  if (legacyObjectId) return legacyObjectId[1];

  // A direct slug is already a valid catalog identifier.
  return slugId;
}
