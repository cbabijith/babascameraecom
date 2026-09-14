import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const key = path.join("/");
  const rangeHeader = request.headers.get("range");

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
    const message = err instanceof Error ? err.message : "Object not found";
    return new Response(message, { status: 404 });
  }
}
