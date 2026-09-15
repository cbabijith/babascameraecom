/**
 * Media URL helpers.
 *
 * Product/banner images live in a private Tigris S3 bucket, so raw
 * storageapi.dev URLs return 403 in the browser. By default the admin
 * rewrites those URLs to its credential-backed streaming proxy at
 * /api/media/<key>.
 *
 * When the bucket is publicly readable (NEXT_PUBLIC_MEDIA_MODE=direct), the
 * rewrite instead points browsers straight at the storage CDN via
 * NEXT_PUBLIC_S3_DIRECT_URL, so image bytes never flow through the app.
 * Mirrors apps/web/src/lib/media-proxy.ts.
 */

// Read lazily so tests and dev env reloads pick up changes without a rebuild.
function directMediaBase(): string {
  return (process.env.NEXT_PUBLIC_S3_DIRECT_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
}

function directModeEnabled(): boolean {
  const mode = (process.env.NEXT_PUBLIC_MEDIA_MODE ?? "proxy")
    .trim()
    .toLowerCase();
  return mode === "direct" && directMediaBase() !== "";
}

// Used only to strip path-style bucket prefixes from stored URLs. Comes
// from the environment; no bucket name is hardcoded in source.
const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET ?? "";

function extractTigrisKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));

    if (path.startsWith("api/media/")) {
      return path.slice("api/media/".length) || null;
    }

    const isTigris =
      hostname === "t3.storageapi.dev" ||
      hostname.endsWith(".t3.storageapi.dev") ||
      hostname === "tigris.dev" ||
      hostname.endsWith(".tigris.dev") ||
      hostname.endsWith(".storageapi.dev");
    if (!isTigris) return null;
    let cleanPath = path;
    if (cleanPath.startsWith(`${S3_BUCKET}/`)) {
      cleanPath = cleanPath.slice(S3_BUCKET.length + 1);
    }
    return cleanPath || null;
  } catch {
    return null;
  }
}

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function mediaProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;

  // Already pointing at the CDN — nothing to rewrite.
  const base = directMediaBase();
  if (directModeEnabled() && url.startsWith(`${base}/`)) return url;

  const key = extractTigrisKey(url);
  if (!key) return null;
  if (directModeEnabled()) return `${base}/${encodeKey(key)}`;
  return `/api/media/${encodeKey(key)}`;
}

/** Rewrite private Tigris URLs to the proxy; leave everything else untouched. */
export function resolveMediaUrl(url: string | null | undefined, fallback = ""): string {
  if (!url) return fallback;
  return mediaProxyUrl(url) ?? url;
}
/* deployed 2026-08-29: build at repo root (rootDirectory=/) */
