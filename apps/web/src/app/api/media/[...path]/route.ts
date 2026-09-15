import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

/** Fail fast: with a high-latency object store, SDK-internal retries turn a
 * single miss into a multi-second stall per image, and pages request dozens. */
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const key = path.join("/");
  const rangeHeader = request.headers.get("range");

  if (!rangeHeader && isRecentlyMissed(key)) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=30" },
    });
  }

  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || "https://t3.storageapi.dev",
    region: process.env.S3_REGION || "auto",
    credentials: {
      accessKeyId:
        process.env.S3_ACCESS_KEY_ID ||
        "tid_KteYSkQcfcdJiJgmJugjOZKSa__SfIrBixPbBxUBjONGLkCBlv",
      secretAccessKey:
        process.env.S3_SECRET_ACCESS_KEY ||
        "tsec_WismHCOpqdA5U9vEiTP7SV5KOAnBAvy12jt4Kv4_uPLb2tKjfHgH5jNWewUMKRFkGP79JU",
    },
    forcePathStyle: true,
    maxAttempts: 1,
  });

  try {
    const s3Res = await client.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET || "arranged-pantry-yko9l8ktd",
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
  } catch (err) {
    // Remember the miss so repeated requests for the same asset skip the
    // round trip entirely while the object (or bucket) is absent.
    if (!rangeHeader) missedKeys.set(key, Date.now());
    if (missedKeys.size > 5_000) {
      for (const [missedKey, at] of missedKeys) {
        if (Date.now() - at > MISSED_KEY_TTL_MS) missedKeys.delete(missedKey);
      }
    }
    const message = err instanceof Error ? err.message : "Object not found";
    return new Response(message, {
      status: 404,
      headers: { "Cache-Control": "public, max-age=30" },
    });
  }
}
