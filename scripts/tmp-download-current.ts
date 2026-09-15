import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { writeFile } from "node:fs/promises";

// [filename-from-stored-url, local-name]
const targets: Array<{ pid: string; file: string; out: string }> = [
  { pid: "0ee4db62-0e42-4d8f-bd55-eee1d57fd4cc", file: "61f8be60-7a16-4ada-8cd8-5e70f7174ec5.webp", out: "canon90d" },
  { pid: "30f18da5-6d67-4662-a01c-2a6f9f9f7f8e", file: "685bcda7-876a-4784-8e78-ad93e20fe23c.webp", out: "tripod300d" },
  { pid: "9205e5d6-3f79-4c8b-af04-dd3d32061a60", file: "a605bede-97cd-41f1-8346-36325cdeba4f.webp", out: "canon50mm" },
  { pid: "ee0921fb-9d3c-405c-9930-9dff83ac6d7f", file: "dd18016d-5d35-436b-9db5-0d360e21bb7c.webp", out: "marumi30" },
  { pid: "765e908f-2d9c-46c5-888b-83d000be7282", file: "f7c98fb4-2617-4f83-8785-ffa52c7a0eef.webp", out: "idiscovery77" },
  { pid: "15dfc3c3-3ea0-443c-864e-eff991be94ff", file: "9cf6d778-ad48-4c76-b5af-fa12980007cd.webp", out: "marumi43" },
  { pid: "aa7ec2cd-8bc2-4074-9697-7938106d0f69", file: "11bb3d3d-4b76-4902-ab1e-84def8347bf4.webp", out: "kenko46" },
  { pid: "58dd1ecd-bf21-4080-adec-28a2c864cc4b", file: "9cb94c2e-cf55-4dca-bdda-40951c669359.webp", out: "marumi28" },
  { pid: "555d7d7f-d3bc-47b9-9495-5b1bf57d2630", file: "29914f3a-ff20-472e-842e-259c4713fa8d.webp", out: "hoya77" },
  { pid: "69c8573a-f387-4fff-bc11-4c56719bf1bd", file: "8ac4fab1-985b-4e7d-9ab8-a8c16d2dedfe.webp", out: "kenko52" },
  { pid: "3399cf81-2761-4735-98e9-d393a172db10", file: "4ed38682-0883-4b96-903a-568ec2aa7af0.webp", out: "hoya58" },
  { pid: "50205ddd-a7ed-4cf7-aa49-47986de655ab", file: "c0125660-2ff3-472f-9120-3c6666b3fde9.webp", out: "kenko67" },
  { pid: "03f6af54-b97e-4136-bd36-dece9a2de153", file: "b5687d71-a700-46a2-a250-12695a178f8c.webp", out: "uv43" },
  { pid: "94ef4270-12d2-4146-a45e-c8ec042a1191", file: "a284b7c0-90cc-4306-af07-368c6dfafe37.webp", out: "uv62" },
  { pid: "e43d7843-3b19-4720-a9e2-1dd5ac71bc7a", file: "8fffd58c-e0f0-4237-91cb-d45b59701ff4.webp", out: "uv72" },
  { pid: "a965d57e-1006-4e98-9faa-459961556e36", file: "846ffbe2-b0de-403f-a6f0-75c78fe15a3d.webp", out: "marumi25" },
  { pid: "608aa192-ae43-4d3c-bc1e-9e1571c161de", file: "62e33a7c-f890-40bf-a693-cfa59c013cfc.webp", out: "hoya82" },
  { pid: "4565fa58-08b2-42d7-b480-4dc524d44f76", file: "733bb9ef-a461-4cd7-ac88-5b4009436aaa.webp", out: "hoyair58" },
  { pid: "fccf8bb6-bd18-427c-b936-4922844a130c", file: "c6fad75f-b546-4d27-8733-a524a8e82684.webp", out: "specialfx" },
  { pid: "efb6ef74-ecb5-4ad2-ade4-39d239094165", file: "3acacbb9-cf3e-4393-92e2-0e06ff3ac380.webp", out: "glass7177p" },
];

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

  for (const t of targets) {
    const key = `products/${t.pid}/${t.file}`;
    try {
      const res = await client.send(
        new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }),
      );
      const bytes = Buffer.from(await res.Body!.transformToByteArray());
      const path = `/tmp/babas/current/${t.out}.webp`;
      await writeFile(path, bytes);
      console.log(`${t.out}: ${bytes.length} bytes`);
    } catch (err) {
      console.error(`${t.out}: FAILED ${err}`);
    }
  }
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
