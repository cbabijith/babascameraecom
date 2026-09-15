import { getDatabase, products, inArray } from "../packages/db/src/index.ts";

async function run() {
  const db = getDatabase();
  const rows = await db
    .select({ sku: products.sku, name: products.name, mrp: products.mrp, salePrice: products.salePrice })
    .from(products)
    .where(inArray(products.sku, ["CANON-EOS90D", "222", "343", "B001877", "B001882", "B001861", "B001867", "B001869", "B001875", "B001870", "B001859", "4957638452588", "4957638452021", "4957638452748", "4957638452519", "4961607383476", "4961607152980", "4961607167984", "024066015457", "024066067241"]));
  for (const r of rows) console.log(`${r.sku} | ${r.name} | MRP=${r.mrp} SALE=${r.salePrice}`);
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
