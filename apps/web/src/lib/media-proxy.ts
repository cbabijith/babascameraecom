/**
 * Media URL helpers.
 *
 * Product/banner images live in a private Tigris S3 bucket, so raw
 * storageapi.dev URLs return 403 in the browser. The storefront exposes a
 * credential-backed streaming proxy at /api/media/<key>, so any Tigris URL is
 * rewritten to that path (works for both <next/image> and plain <img>).
 */

const S3_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET || "arranged-pantry-yko9l8ktd";

function extractTigrisKey(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const isTigris =
      hostname === "t3.storageapi.dev" ||
      hostname.endsWith(".t3.storageapi.dev") ||
      hostname === "tigris.dev" ||
      hostname.endsWith(".tigris.dev") ||
      hostname.endsWith(".storageapi.dev");
    if (!isTigris) return null;
    let path = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    if (path.startsWith(`${S3_BUCKET}/`)) {
      path = path.slice(S3_BUCKET.length + 1);
    }
    return path || null;
  } catch {
    return null;
  }
}

export function mediaProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  const key = extractTigrisKey(url);
  if (!key) return null;
  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Rewrite private Tigris URLs to the proxy; leave everything else untouched. */
export function resolveMediaUrl(url: string | null | undefined, fallback = ""): string {
  if (!url) return fallback;
  return mediaProxyUrl(url) ?? url;
}
