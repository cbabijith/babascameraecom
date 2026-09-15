import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

async function run() {
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT!,
    region: process.env.S3_REGION || "auto",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });

  const prefixes = [
    "products/0ee4db62-0e42-4d8f-bd55-eee1d57fd4cc/",
    "products/30f18da5-6d67-4662-a01c-2a6f9f9f7f8e/",
    "products/9205e5d6-3f79-4c8b-af04-dd3d32061a60/",
  ];

  for (const prefix of prefixes) {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET!, Prefix: prefix }),
    );
    console.log(`\n== ${prefix} (${res.Contents?.length ?? 0} objects)`);
    for (const obj of res.Contents ?? []) console.log(`  ${obj.Key} (${obj.Size} bytes)`);
  }

  // Also count total objects under products/
  let total = 0;
  let token: string | undefined;
  do {
    const res: any = await client.send(
      new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET!,
        Prefix: "products/",
        MaxKeys: 1000,
        ContinuationToken: token,
      }),
    );
    total += res.Contents?.length ?? 0;
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  console.log(`\nTotal objects under products/: ${total}`);

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
