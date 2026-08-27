import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client() {
  const endpoint = process.env.S3_ENDPOINT || "https://t3.storageapi.dev";
  const region = process.env.S3_REGION || "auto";
  const accessKeyId =
    process.env.S3_ACCESS_KEY_ID ||
    "tid_KteYSkQcfcdJiJgmJugjOZKSa__SfIrBixPbBxUBjONGLkCBlv";
  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY ||
    "tsec_WismHCOpqdA5U9vEiTP7SV5KOAnBAvy12jt4Kv4_uPLb2tKjfHgH5jNWewUMKRFkGP79JU";

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  });
}

export const S3_BUCKET = process.env.S3_BUCKET || "arranged-pantry-yko9l8ktd";
export const S3_PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_S3_PUBLIC_URL ||
  `https://${S3_BUCKET}.t3.storageapi.dev`;

export function getPublicUrlForS3Key(key: string): string {
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
      if (pathname.startsWith(`${S3_BUCKET}/`)) {
        return pathname.slice(S3_BUCKET.length + 1);
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
      Bucket: S3_BUCKET,
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
      Bucket: S3_BUCKET,
      Key: cleanKey,
    })
  );
}

export async function deleteManyFromS3(keys: string[]): Promise<void> {
  if (!keys.length) return;
  const client = getS3Client();
  await client.send(
    new DeleteObjectsCommand({
      Bucket: S3_BUCKET,
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
      Bucket: S3_BUCKET,
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
      Bucket: S3_BUCKET,
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
      Bucket: S3_BUCKET,
      Key: cleanKey,
      ContentType: contentType,
      ACL: "public-read",
    }),
    { expiresIn }
  );
}
