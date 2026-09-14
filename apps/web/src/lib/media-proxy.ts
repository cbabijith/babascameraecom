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
    if (url.startsWith("api/media/")) {
      return url.slice("api/media/".length) || null;
    }
    if (url.startsWith("/api/media/")) {
      return url.slice("/api/media/".length) || null;
    }

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
    if (url && !url.startsWith("/") && !url.startsWith("http")) {
      return url;
    }
    return null;
  }
}

export function mediaProxyUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/api/media/")) return url;
  if (url.startsWith("api/media/")) return `/${url}`;

  // Static assets starting with / (except /api/media/)
  if (url.startsWith("/")) return null;

  const key = extractTigrisKey(url);
  if (!key) return null;
  return `/api/media/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Rewrite private Tigris URLs to the proxy; leave everything else untouched. */
export function resolveMediaUrl(url: string | null | undefined, fallback = ""): string {
  if (!url) return fallback;
  return mediaProxyUrl(url) ?? url;
}
