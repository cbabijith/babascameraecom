import { randomUUID } from "node:crypto";

import {
  and,
  asc,
  desc,
  eq,
  ilike,
  or,
  sql,
  brands,
  categories,
  getDatabase,
  productImages,
  products,
  uploadToS3,
} from "@babascamera/db";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

class ToolError extends Error {}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function money(value: unknown, field: string): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new ToolError(`${field} must be a non-negative number.`);
  }
  return n.toFixed(2);
}

async function uniqueSlug(base: string): Promise<string> {
  const database = getDatabase();
  let slug = base || "product";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [row] = await database
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);
    if (!row) return slug;
    slug = `${base}-${randomUUID().slice(0, 6)}`;
  }
  throw new ToolError("Could not derive a unique slug. Provide a distinct name.");
}

async function uniqueSku(base: string): Promise<string> {
  const database = getDatabase();
  let sku = base;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [row] = await database
      .select({ id: products.id })
      .from(products)
      .where(eq(products.sku, sku))
      .limit(1);
    if (!row) return sku;
    sku = `${base}-${randomUUID().slice(0, 4)}`;
  }
  throw new ToolError("Could not derive a unique SKU.");
}

async function resolveCategory(idOrName: string, autoCreate: boolean): Promise<string> {
  const database = getDatabase();
  const [row] = await database
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(or(eq(categories.id, idOrName), eq(categories.name, idOrName)))
    .limit(1);
  if (row) return row.id;
  if (!autoCreate) {
    throw new ToolError(`Category "${idOrName}" not found. Use list_categories to see options.`);
  }
  const name = idOrName.trim();
  const [created] = await database
    .insert(categories)
    .values({ name, slug: `${slugify(name)}-${randomUUID().slice(0, 6)}` })
    .returning({ id: categories.id });
  if (!created) throw new ToolError(`Could not create category "${name}".`);
  return created.id;
}

async function resolveBrand(idOrName: string | null | undefined): Promise<string | null> {
  if (!idOrName || !String(idOrName).trim()) return null;
  const needle = String(idOrName).trim();
  const database = getDatabase();
  const [row] = await database
    .select({ id: brands.id })
    .from(brands)
    .where(or(eq(brands.id, needle), eq(brands.name, needle)))
    .limit(1);
  if (row) return row.id;
  const [created] = await database
    .insert(brands)
    .values({ name: needle, slug: `${slugify(needle)}-${randomUUID().slice(0, 6)}` })
    .returning({ id: brands.id });
  return created?.id ?? null;
}

async function findProduct(idOrSlug: string) {
  const database = getDatabase();
  const [row] = await database
    .select()
    .from(products)
    .where(or(eq(products.id, idOrSlug), eq(products.slug, idOrSlug)))
    .limit(1);
  if (!row) throw new ToolError(`Product "${idOrSlug}" not found.`);
  return row;
}

async function imagesFor(productId: string) {
  const database = getDatabase();
  return database
    .select({ url: productImages.url, isPrimary: productImages.isPrimary })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(desc(productImages.isPrimary), asc(productImages.position));
}

/**
 * Import an image from a public https URL into the store's media bucket so
 * product images stay canonical. Guards: https only, ≤ 8 MB, image/* only.
 */
async function importImageToBucket(imageUrl: string): Promise<string> {
  const parsed = new URL(imageUrl);
  if (parsed.protocol !== "https:") {
    throw new ToolError("Only https:// image URLs can be imported.");
  }
  const res = await fetch(parsed, { redirect: "follow" });
  if (!res.ok) throw new ToolError(`Image URL returned ${res.status}.`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new ToolError(`URL is not an image (content-type ${contentType || "unknown"}).`);
  }
  const declaredLength = Number(res.headers.get("content-length") ?? 0);
  if (declaredLength > 8 * 1024 * 1024) {
    throw new ToolError("Image is larger than 8 MB.");
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > 8 * 1024 * 1024) {
    throw new ToolError("Image is larger than 8 MB.");
  }
  const ext = contentType.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "jpg";
  const { url } = await uploadToS3({
    key: `product-imports/${randomUUID()}.${ext}`,
    body: buffer,
    contentType,
  });
  return url;
}

async function attachImage(productId: string, url: string, primary: boolean) {
  const database = getDatabase();
  if (primary) {
    await database
      .update(productImages)
      .set({ isPrimary: false })
      .where(eq(productImages.productId, productId));
  }
  const [{ nextPosition }] = await database
    .select({
      nextPosition: sql<number>`coalesce(max(${productImages.position}) + 1, 0)`,
    })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  await database.insert(productImages).values({
    productId,
    url,
    isPrimary: primary,
    position: nextPosition,
    altText: null,
  });
}

/* ------------------------------------------------------------------ */
/* tools                                                               */
/* ------------------------------------------------------------------ */

export async function searchProducts(input: {
  query?: string;
  category?: string;
  brand?: string;
  includeInactive?: boolean;
  limit?: number;
}) {
  const database = getDatabase();
  const conditions = [];
  if (!input.includeInactive) conditions.push(eq(products.isActive, true));
  if (input.query) {
    conditions.push(
      or(
        ilike(products.name, `%${input.query}%`),
        ilike(products.sku, `%${input.query}%`),
      )!,
    );
  }
  if (input.category) {
    conditions.push(
      sql`${products.categoryId} in (select id from categories where name ilike ${`%${input.category}%`} or id = ${input.category})`,
    );
  }
  if (input.brand) {
    conditions.push(
      sql`${products.brandId} in (select id from brands where name ilike ${`%${input.brand}%`} or id = ${input.brand})`,
    );
  }
  const rows = await database
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      salePrice: products.salePrice,
      mrp: products.mrp,
      stock: products.stock,
      isActive: products.isActive,
      isFeatured: products.isFeatured,
    })
    .from(products)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(products.updatedAt))
    .limit(Math.min(Math.max(input.limit ?? 20, 1), 100));

  return {
    count: rows.length,
    products: rows.map((row) => ({
      ...row,
      note: "Use get_product with the id or slug for full details.",
    })),
  };
}

export async function getProduct(input: { idOrSlug: string }) {
  const database = getDatabase();
  const row = await findProduct(input.idOrSlug);
  const [category] = await database
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.id, row.categoryId))
    .limit(1);
  const brand = row.brandId
    ? (
        await database
          .select({ id: brands.id, name: brands.name })
          .from(brands)
          .where(eq(brands.id, row.brandId))
          .limit(1)
      )[0]
    : null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    description: row.description,
    shortDescription: row.shortDescription,
    category: category ?? null,
    brand: brand ?? null,
    price: { mrp: row.mrp, salePrice: row.salePrice },
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    warranty: row.warranty,
    images: await imagesFor(row.id),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function createProduct(input: {
  name: string;
  price: number;
  mrp?: number;
  stock?: number;
  sku?: string;
  category: string;
  brand?: string;
  description?: string;
  shortDescription?: string;
  isFeatured?: boolean;
  imageUrls?: string[];
}) {
  if (!input.name?.trim()) throw new ToolError("name is required.");
  const salePrice = money(input.price, "price");
  const mrp = input.mrp != null ? money(input.mrp, "mrp") : salePrice;
  if (Number(mrp) < Number(salePrice)) {
    throw new ToolError("mrp must be greater than or equal to price.");
  }
  const database = getDatabase();
  const categoryId = await resolveCategory(input.category, true);
  const brandId = await resolveBrand(input.brand);
  const slug = await uniqueSlug(slugify(input.name));
  const sku = await uniqueSku(input.sku?.trim() || slug.toUpperCase());

  const [created] = await database
    .insert(products)
    .values({
      name: input.name.trim(),
      slug,
      sku,
      categoryId,
      brandId,
      description: input.description?.trim() || null,
      shortDescription: input.shortDescription?.trim() || null,
      mrp,
      salePrice,
      stock: Math.max(0, Math.trunc(Number(input.stock ?? 0)) || 0),
      isFeatured: Boolean(input.isFeatured),
      isActive: true,
    })
    .returning({ id: products.id, slug: products.slug, sku: products.sku });

  const imported: string[] = [];
  const failed: string[] = [];
  for (const url of (input.imageUrls ?? []).slice(0, 6)) {
    try {
      const stored = await importImageToBucket(url);
      await attachImage(created.id, stored, imported.length === 0);
      imported.push(url);
    } catch (error) {
      failed.push(`${url} — ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  return {
    created: {
      id: created.id,
      name: input.name.trim(),
      slug: created.slug,
      sku: created.sku,
      storefrontUrl: `https://www.babascamera.com/products/${created.slug}`,
    },
    imagesImported: imported.length,
    imagesFailed: failed,
  };
}

export async function updateProduct(input: {
  idOrSlug: string;
  name?: string;
  price?: number;
  mrp?: number;
  stock?: number;
  category?: string;
  brand?: string | null;
  description?: string;
  shortDescription?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  warranty?: string;
}) {
  const database = getDatabase();
  const row = await findProduct(input.idOrSlug);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name?.trim()) {
    patch.name = input.name.trim();
    if (slugify(input.name) !== row.slug) patch.slug = await uniqueSlug(slugify(input.name));
  }
  const nextPrice = input.price != null ? money(input.price, "price") : row.salePrice;
  const nextMrp = input.mrp != null ? money(input.mrp, "mrp") : row.mrp;
  if (Number(nextMrp) < Number(nextPrice)) {
    throw new ToolError("mrp must be greater than or equal to price.");
  }
  patch.salePrice = nextPrice;
  patch.mrp = nextMrp;
  if (input.stock != null) patch.stock = Math.max(0, Math.trunc(Number(input.stock)) || 0);
  if (input.category) patch.categoryId = await resolveCategory(input.category, true);
  if (input.brand !== undefined) patch.brandId = await resolveBrand(input.brand);
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.shortDescription !== undefined) patch.shortDescription = input.shortDescription?.trim() || null;
  if (input.isFeatured !== undefined) patch.isFeatured = Boolean(input.isFeatured);
  if (input.isActive !== undefined) patch.isActive = Boolean(input.isActive);
  if (input.warranty !== undefined) patch.warranty = input.warranty?.trim() || null;

  await database.update(products).set(patch).where(eq(products.id, row.id));
  return getProduct({ idOrSlug: row.id });
}

export async function addProductImage(input: {
  idOrSlug: string;
  imageUrl: string;
  primary?: boolean;
}) {
  const row = await findProduct(input.idOrSlug);
  const stored = await importImageToBucket(input.imageUrl);
  await attachImage(row.id, stored, input.primary ?? true);
  return {
    productId: row.id,
    storedUrl: stored,
    setAsPrimary: input.primary ?? true,
  };
}

export async function removeProductImage(input: { idOrSlug: string; imageUrl: string }) {
  const database = getDatabase();
  const row = await findProduct(input.idOrSlug);
  const deleted = await database
    .delete(productImages)
    .where(and(eq(productImages.productId, row.id), eq(productImages.url, input.imageUrl)))
    .returning({ id: productImages.id });
  if (!deleted.length) {
    throw new ToolError("That image URL is not attached to this product (exact URL required — see get_product).");
  }
  return { removed: deleted.length };
}

export async function listCategories() {
  const database = getDatabase();
  const rows = await database
    .select({ id: categories.id, name: categories.name, slug: categories.slug, isActive: categories.isActive })
    .from(categories)
    .orderBy(asc(categories.name));
  return { count: rows.length, categories: rows };
}

export async function listBrands() {
  const database = getDatabase();
  const rows = await database
    .select({ id: brands.id, name: brands.name, slug: brands.slug, isActive: brands.isActive })
    .from(brands)
    .orderBy(asc(brands.name));
  return { count: rows.length, brands: rows };
}

export { ToolError };
