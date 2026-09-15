import { getDatabase, products, inArray } from "../packages/db/src/index.ts";

async function run() {
  const db = getDatabase();
  const ids = [
    "0ee4db62-0e42-4d8f-bd55-eee1d57fd4cc",
    "30f18da5-6d67-4662-a01c-2a6f9f9f7f8e",
    "9205e5d6-3f79-4c8b-af04-dd3d32061a60",
    "ee0921fb-9d3c-405c-9930-9dff83ac6d7f",
    "765e908f-2d9c-46c5-888b-83d000be7282",
    "15dfc3c3-3ea0-443c-864e-eff991be94ff",
    "aa7ec2cd-8bc2-4074-9697-7938106d0f69",
    "58dd1ecd-bf21-4080-adec-28a2c864cc4b",
    "555d7d7f-d3bc-47b9-9495-5b1bf57d2630",
    "69c8573a-f387-4fff-bc11-4c56719bf1bd",
    "3399cf81-2761-4735-98e9-d393a172db10",
    "50205ddd-a7ed-4cf7-aa49-47986de655ab",
    "03f6af54-b97e-4136-bd36-dece9a2de153",
    "94ef4270-12d2-4146-a45e-c8ec042a1191",
    "e43d7843-3b19-4720-a9e2-1dd5ac71bc7a",
    "a965d57e-1006-4e98-9faa-459961556e36",
    "608aa192-ae43-4d3c-bc1e-9e1571c161de",
    "4565fa58-08b2-42d7-b480-4dc524d44f76",
    "fccf8bb6-bd18-427c-b936-4922844a130c",
    "efb6ef74-ecb5-4ad2-ade4-39d239094165",
  ];
  const rows = await db
    .select({
      sku: products.sku,
      name: products.name,
      shortDescription: products.shortDescription,
      description: products.description,
    })
    .from(products)
    .where(inArray(products.id, ids));

  for (const r of rows) {
    console.log(`### ${r.sku} | ${r.name}`);
    console.log(`SHORT: ${r.shortDescription ?? ""}`);
    const desc = (r.description ?? "").replace(/\s+/g, " ").slice(0, 400);
    console.log(`DESC: ${desc}`);
    console.log("");
  }
  process.exit(0);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
