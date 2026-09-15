import "server-only";

/**
 * Tiny in-process TTL cache for reference data that is read on nearly every
 * request (categories, brands, store settings, banners) but changes rarely.
 * The database lives behind a high-latency connection, so each saved query
 * directly shortens every page that renders this data.
 */
const DEFAULT_TTL_MS = 30_000;

const entries = new Map<string, { at: number; value: unknown }>();

export async function withTtlCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const hit = entries.get(key);
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) {
    return hit.value as T;
  }
  const value = await loader();
  entries.set(key, { at: now, value });
  return value;
}

/** Test helper: drop every cached entry. */
export function clearTtlCache() {
  entries.clear();
}
