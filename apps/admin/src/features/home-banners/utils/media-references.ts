import { resolveMediaUrl } from "@/lib/media-proxy";

/**
 * Stored banner media references vs display references.
 *
 * The admin list API serves stored media through resolveMediaUrl (e.g.
 * "/api/media/<key>" in proxy mode). When a client echoes those display
 * values back on save they must be swapped for the raw stored references —
 * persisting the proxy path breaks rendering downstream and makes
 * removeReplacedMedia treat the original asset as replaced and delete it.
 */

export const BANNER_MEDIA_FIELDS = [
  "desktopMediaUrl",
  "mobileMediaUrl",
  "posterUrl",
] as const;

export type BannerMediaReferences = {
  [K in (typeof BANNER_MEDIA_FIELDS)[number]]: string | null;
};

export function restoreStoredMediaReferences<
  T extends BannerMediaReferences,
>(parsed: T, previous: BannerMediaReferences): T {
  const restored = { ...parsed };
  for (const field of BANNER_MEDIA_FIELDS) {
    const incoming = restored[field];
    const stored = previous[field];
    if (incoming && stored && incoming !== stored && incoming === resolveMediaUrl(stored)) {
      restored[field] = stored;
    }
  }
  return restored;
}

export function findUnresolvableMedia(
  parsed: BannerMediaReferences,
): (typeof BANNER_MEDIA_FIELDS)[number] | null {
  for (const field of BANNER_MEDIA_FIELDS) {
    const value = parsed[field];
    if (value && value.startsWith("/api/media/")) {
      return field;
    }
  }
  return null;
}
