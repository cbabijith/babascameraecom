import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const key = path.join("/");
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
      })
    );

    if (!s3Res.Body) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    if (s3Res.ContentType) headers.set("Content-Type", s3Res.ContentType);
    if (s3Res.ContentLength)
      headers.set("Content-Length", String(s3Res.ContentLength));
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(s3Res.Body.transformToWebStream(), {
      status: 200,
      headers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Object not found";
    return new Response(message, { status: 404 });
  }
}
