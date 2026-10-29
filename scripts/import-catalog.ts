/**
 * Imports the ERP stock export (JSON produced from the "All Items" sheet of
 * Babas-Camera-All-Items-Mixed-List.xlsx) into the catalog tables. Idempotent:
 * categories and brands upsert by slug, products upsert by SKU. Re-running
 * refreshes prices and stock.
 *
 * Usage:
 *   DATABASE_URL=... bun scripts/import-catalog.ts < catalog.json
 */
import { readFileSync } from "node:fs";

import { getDatabase, brands, categories, products } from "../packages/db/src/index.ts";

interface CatalogItem {
  sl: number;
  category: string;
  categorySlug: string;
  barcode: string;
  name: string;
  brand: string | null;
  qty: number;
  rate: number;
}

const items: CatalogItem[] = JSON.parse(readFileSync(0, "utf8"));
if (!Array.isArray(items) || items.length === 0) {
  throw new Error("Catalog JSON is empty or malformed.");
}

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)
    .replace(/-+$/g, "");

const money = (value: number): string => value.toFixed(2);

const db = getDatabase();

// --- categories ------------------------------------------------------------
const categoryRows = new Map(
  [...new Set(items.map((item) => item.categorySlug))].map((slug) => {
    const sample = items.find((item) => item.categorySlug === slug)!;
    return [
      slug,
      {
        name: sample.category,
        slug,
        description: `${sample.category} at Baba's Camera.`,
        isActive: true,
      },
    ];
  }),
);
for (const row of categoryRows.values()) {
  await db
    .insert(categories)
    .values(row)
    .onConflictDoUpdate({
      target: categories.slug,
      set: { name: row.name, isActive: true, updatedAt: new Date() },
    });
}
console.log(`Categories ensured: ${categoryRows.size}`);

// --- brands ----------------------------------------------------------------
const brandNames = [...new Set(items.map((item) => item.brand).filter((b): b is string => Boolean(b)))];
const brandSlugs = new Map<string, string>();
for (const name of brandNames) {
  const slug = slugify(name);
  brandSlugs.set(name, slug);
  await db
    .insert(brands)
    .values({ name, slug, isActive: true })
    .onConflictDoUpdate({
      target: brands.slug,
      set: { name, isActive: true, updatedAt: new Date() },
    });
}
console.log(`Brands ensured: ${brandNames.length}`);

// --- products --------------------------------------------------------------
const categoryIds = new Map(
  (await db.select({ id: categories.id, slug: categories.slug }).from(categories)).map((c) => [c.slug, c.id]),
);
const brandIds = new Map(
  (await db.select({ id: brands.id, slug: brands.slug }).from(brands)).map((b) => [b.slug, b.id]),
);

const existingSlugs = new Set(
  (await db.select({ slug: products.slug }).from(products)).map((row) => row.slug),
);
const usedSlugs = new Set(existingSlugs);

let inserted = 0;
let updated = 0;
const zeroPrice: string[] = [];
const stockValue = { total: 0 };

await db.transaction(async (tx) => {
  for (const item of items) {
    let slug = slugify(item.name);
    if (!slug) slug = `item-${item.barcode}`;
    if (usedSlugs.has(slug)) slug = `${slug}-${item.barcode.toLowerCase()}`;
    if (usedSlugs.has(slug)) {
      let n = 2;
      while (usedSlugs.has(`${slug}-${n}`)) n += 1;
      slug = `${slug}-${n}`;
    }
    usedSlugs.add(slug);

    const categoryId = categoryIds.get(item.categorySlug);
    if (!categoryId) throw new Error(`Missing category for ${item.categorySlug}`);
    const brandId = item.brand ? (brandIds.get(brandSlugs.get(item.brand)!) ?? null) : null;

    const values = {
      name: item.name,
      slug,
      shortDescription: `${item.name} — genuine product from Baba's Camera, Trivandrum.`,
      description: `${item.name}. ${item.category} available at Baba's Camera with genuine warranty support. Contact us for availability and demo.`,
      categoryId,
      brandId,
      sku: item.barcode,
      mrp: money(item.rate),
      salePrice: money(item.rate),
      stock: item.qty,
      isActive: true,
      updatedAt: new Date(),
    };

    const result = await tx
      .insert(products)
      .values(values)
      .onConflictDoUpdate({
        target: products.sku,
        set: {
          name: values.name,
          mrp: values.mrp,
          salePrice: values.salePrice,
          stock: values.stock,
          categoryId: values.categoryId,
          brandId: values.brandId,
          shortDescription: values.shortDescription,
          description: values.description,
          isActive: true,
          updatedAt: values.updatedAt,
        },
      })
      .returning({ id: products.id, createdAt: products.createdAt, updatedAt: products.updatedAt });

    const row = result[0];
    if (row && row.createdAt.getTime() === row.updatedAt.getTime()) inserted += 1;
    else updated += 1;

    if (item.rate === 0) zeroPrice.push(`${item.barcode} ${item.name}`);
    stockValue.total += item.rate * item.qty;
  }
});

const productTotal = (await db.select({ id: products.id }).from(products)).length;
const categoryTotal = (await db.select({ id: categories.id }).from(categories)).length;
const brandTotal = (await db.select({ id: brands.id }).from(brands)).length;
console.log(`Database totals: products=${productTotal} categories=${categoryTotal} brands=${brandTotal}`);
console.log(`Import complete: ${inserted} inserted, ${updated} refreshed.`);
console.log(`Stock value represented: INR ${stockValue.total.toFixed(2)}`);
if (zeroPrice.length) {
  console.log(`Zero-price items (${zeroPrice.length}) — price on request:`);
  for (const line of zeroPrice) console.log(`  - ${line}`);
}
process.exit(0);
