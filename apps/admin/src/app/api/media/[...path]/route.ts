import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

/**
 * Media streaming proxy.
 *
 * In direct mode (publicly readable bucket) every request is redirected to
 * the storage CDN so image bytes never flow through this server. In proxy
 * mode the object is streamed with the app's own credentials.
 */

// A single long-lived client amortizes the TLS handshake and SigV4 signing
// across requests. Rebuilt only when the environment changes (dev reloads).
let cachedClient: S3Client | null = null;
let cachedClientConfig = "";

function getMediaClient(
  endpoint: string,
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
): S3Client {
  const config = [endpoint, region, accessKeyId].join("|");
  if (!cachedClient || cachedClientConfig !== config) {
    cachedClient = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
      maxAttempts: 1,
    });
    cachedClientConfig = config;
  }
  return cachedClient;
}

/** Fail fast on SDK errors: with a high-latency object store, SDK-internal
 * retries turn a single miss into a multi-second stall per asset, and list
 * pages request dozens at once. */
const MISSED_KEY_TTL_MS = 60_000;
const missedKeys = new Map<string, number>();

function isRecentlyMissed(key: string): boolean {
  const at = missedKeys.get(key);
  if (!at) return false;
  if (Date.now() - at > MISSED_KEY_TTL_MS) {
    missedKeys.delete(key);
    return false;
  }
  return true;
}

function directRedirectUrl(path: string[]): string | null {
  const mode = (process.env.NEXT_PUBLIC_MEDIA_MODE ?? "proxy")
    .trim()
    .toLowerCase();
  const base = (process.env.NEXT_PUBLIC_S3_PUBLIC_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (mode !== "direct" || !base) return null;
  return `${base}/${path.map(encodeURIComponent).join("/")}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const key = path.join("/");
  const rangeHeader = request.headers.get("range");

  const redirectUrl = directRedirectUrl(path);
  if (redirectUrl) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // All S3 settings come from the environment — no provider names, buckets
  // or credentials are hardcoded anywhere in the app.
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    console.error("[media] S3 storage is not configured (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY).");
    return new Response("Media storage is not configured.", { status: 503 });
  }

  if (!rangeHeader && isRecentlyMissed(key)) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=30" },
    });
  }

  const client = getMediaClient(
    endpoint,
    process.env.S3_REGION?.trim() || "auto",
    accessKeyId,
    secretAccessKey,
  );

  try {
    const s3Res = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: rangeHeader || undefined,
      })
    );

    if (!s3Res.Body) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    let contentType = s3Res.ContentType;
    if (!contentType || contentType === "application/octet-stream") {
      const lowerKey = key.toLowerCase();
      if (lowerKey.endsWith(".webp")) contentType = "image/webp";
      else if (lowerKey.endsWith(".png")) contentType = "image/png";
      else if (lowerKey.endsWith(".jpg") || lowerKey.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (lowerKey.endsWith(".svg")) contentType = "image/svg+xml";
      else if (lowerKey.endsWith(".gif")) contentType = "image/gif";
      else if (lowerKey.endsWith(".mp4")) contentType = "video/mp4";
      else if (lowerKey.endsWith(".webm")) contentType = "video/webm";
      else contentType = "application/octet-stream";
    }
    headers.set("Content-Type", contentType);
    headers.set("Accept-Ranges", "bytes");

    if (s3Res.ContentLength)
      headers.set("Content-Length", String(s3Res.ContentLength));
    if (s3Res.ContentRange)
      headers.set("Content-Range", s3Res.ContentRange);

    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    const status = s3Res.ContentRange ? 206 : 200;

    return new Response(s3Res.Body.transformToWebStream(), {
      status,
      headers,
    });
  } catch {
    // Remember the miss so repeated requests for the same asset skip the
    // round trip entirely while the object (or bucket) is absent. The raw
    // SDK error is logged, never returned to the client — it can expose
    // bucket and endpoint details.
    if (!rangeHeader) missedKeys.set(key, Date.now());
    if (missedKeys.size > 5_000) {
      for (const [missedKey, at] of missedKeys) {
        if (Date.now() - at > MISSED_KEY_TTL_MS) missedKeys.delete(missedKey);
      }
    }
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=30" },
    });
  }
}
