import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * All S3 settings come from the environment — no hardcoded endpoints,
 * bucket names or credentials. Missing values fail fast with a clear
 * message instead of silently pointing at the wrong storage.
 */
function requireS3Env() {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 storage is not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.",
    );
  }
  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region: process.env.S3_REGION?.trim() || "auto",
  };
}

function getS3Client() {
  const { endpoint, region, accessKeyId, secretAccessKey } = requireS3Env();

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
    // Three SDK retries compound badly over a high-latency link; one retry
    // still absorbs transient blips without stalling requests for seconds.
    maxAttempts: 2,
  });
}

export function getS3Bucket(): string {
  return requireS3Env().bucket;
}

export const S3_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_S3_PUBLIC_URL?.trim() ?? "";

export function getPublicUrlForS3Key(key: string): string {
  if (!S3_PUBLIC_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_S3_PUBLIC_URL is not set. Configure the public media base URL to store asset links.",
    );
  }
  const cleanKey = key.replace(/^\/+/, "");
  return `${S3_PUBLIC_BASE_URL}/${cleanKey}`;
}

export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.includes("storageapi.dev") ||
      parsed.hostname.includes("tigris.dev")
    ) {
      const pathname = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
      const bucket = getS3Bucket();
      if (pathname.startsWith(`${bucket}/`)) {
        return pathname.slice(bucket.length + 1);
      }
      return pathname;
    }
    return null;
  } catch {
    return null;
  }
}

export async function uploadToS3(params: {
  key: string;
  body: Uint8Array | Buffer | string;
  contentType: string;
  cacheControl?: string;
}): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const cleanKey = params.key.replace(/^\/+/, "");
  await client.send(
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: cleanKey,
      Body: params.body,
      ContentType: params.contentType,
      ACL: "public-read",
      CacheControl:
        params.cacheControl || "public, max-age=31536000, immutable",
    })
  );
  return {
    key: cleanKey,
    url: getPublicUrlForS3Key(cleanKey),
  };
}

export async function deleteFromS3(key: string): Promise<void> {
  const client = getS3Client();
  const cleanKey = key.replace(/^\/+/, "");
  await client.send(
    new DeleteObjectCommand({
      Bucket: getS3Bucket(),
      Key: cleanKey,
    })
  );
}

export async function deleteManyFromS3(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const client = getS3Client();
  await client.send(
    new DeleteObjectsCommand({
      Bucket: getS3Bucket(),
      Delete: {
        Objects: keys.map((k) => ({ Key: k.replace(/^\/+/, "") })),
      },
    })
  );
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const client = getS3Client();
  const cleanKey = key.replace(/^\/+/, "");
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: getS3Bucket(),
      Key: cleanKey,
    }),
    { expiresIn }
  );
}

/** Read an object (or a byte range) with the app's own S3 credentials.
    Works on private buckets, unlike fetching the public URL. */
export async function getS3ObjectBytes(
  key: string,
  range?: { start: number; end: number }
): Promise<{ bytes: Uint8Array; contentType: string | undefined }> {
  const client = getS3Client();
  const cleanKey = key.replace(/^\/+/, "");
  const result = await client.send(
    new GetObjectCommand({
      Bucket: getS3Bucket(),
      Key: cleanKey,
      ...(range ? { Range: `bytes=${range.start}-${range.end}` } : {}),
    })
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, contentType: result.ContentType };
}

export async function getPresignedUploadUrl(
  key: string,
  contentType = "video/mp4",
  expiresIn = 3600
): Promise<string> {
  const client = getS3Client();
  const cleanKey = key.replace(/^\/+/, "");
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: cleanKey,
      ContentType: contentType,
      ACL: "public-read",
    }),
    { expiresIn }
  );
}
