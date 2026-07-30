import {
  and,
  asc,
  brands,
  count,
  db,
  eq,
  ilike,
  products,
  sql,
} from "@babascamera/db";

import type { BrandListItem, BrandListQuery } from "../types";

function selectBrandRows() {
  return db.select({
    id: brands.id,
    name: brands.name,
    slug: brands.slug,
    description: brands.description,
    logoUrl: brands.logoUrl,
    position: brands.position,
    isActive: brands.isActive,
    productCount: count(products.id),
  })
    .from(brands)
    .leftJoin(products, eq(products.brandId, brands.id));
}

function serialize(row: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  position: number;
  isActive: boolean;
  productCount: number;
}): BrandListItem {
  return { ...row, productCount: Number(row.productCount) };
}

export async function listBrands(query: BrandListQuery): Promise<BrandListItem[]> {
  const conditions: ReturnType<typeof eq>[] = [];
  if (query.q) conditions.push(ilike(brands.name, `%${query.q.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`));
  if (query.status !== "all") conditions.push(eq(brands.isActive, query.status === "active"));
  const rows = await selectBrandRows()
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(brands.id)
    .orderBy(asc(brands.position), asc(brands.name));
  return rows.map(serialize);
}

export async function findBrand(id: string) {
  const rows = await selectBrandRows()
    .where(eq(brands.id, id))
    .groupBy(brands.id)
    .limit(1);
  return rows[0] ? serialize(rows[0]) : null;
}

export async function findBrandByNormalizedName(normalizedName: string) {
  const [row] = await db.select({ id: brands.id })
    .from(brands)
    .where(sql`lower(regexp_replace(trim(${brands.name}), '\s+', ' ', 'g')) = ${normalizedName.toLowerCase()}`)
    .limit(1);
  return row ?? null;
}

export async function createBrandRecord(input: {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
}) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('brands_write'))`);
    const [{ nextPosition = 0 } = {}] = await tx.select({
      nextPosition: sql<number>`coalesce(max(${brands.position}), -1) + 1`.mapWith(Number),
    }).from(brands);
    await tx.insert(brands).values({ ...input, position: nextPosition });
  });
}

export async function updateBrandRecord(id: string, input: {
  name: string;
  slug: string;
  logoUrl: string | null;
  isActive: boolean;
}) {
  const [updated] = await db.update(brands)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(brands.id, id))
    .returning({ id: brands.id });
  return updated ?? null;
}

export async function updateBrandStatusRecord(id: string, isActive: boolean) {
  const [updated] = await db.update(brands)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(brands.id, id))
    .returning({ id: brands.id });
  return updated ?? null;
}

export async function deleteBrandRecord(id: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('brands_write'))`);
    const [existing] = await tx.select({ id: brands.id, logoUrl: brands.logoUrl })
      .from(brands)
      .where(eq(brands.id, id))
      .for("update");
    if (!existing) return { kind: "missing" as const };
    const [{ productCount = 0 } = {}] = await tx.select({ productCount: count() })
      .from(products)
      .where(eq(products.brandId, id));
    if (Number(productCount) > 0) {
      return { kind: "dependency" as const, productCount: Number(productCount) };
    }
    await tx.delete(brands).where(eq(brands.id, id));
    const remaining = await tx.select({ id: brands.id }).from(brands)
      .orderBy(asc(brands.position), asc(brands.name));
    for (const [position, row] of remaining.entries()) {
      await tx.update(brands).set({ position, updatedAt: new Date() }).where(eq(brands.id, row.id));
    }
    return { kind: "deleted" as const, logoUrl: existing.logoUrl };
  });
}

export async function reorderBrandRecords(ids: string[]) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('brands_write'))`);
    const existing = await tx.select({ id: brands.id }).from(brands);
    if (!isCompleteBrandOrder(existing.map((row) => row.id), ids)) {
      return false;
    }
    for (const [position, id] of ids.entries()) {
      await tx.update(brands).set({ position, updatedAt: new Date() }).where(eq(brands.id, id));
    }
    return true;
  });
}

export function isCompleteBrandOrder(existingIds: string[], submittedIds: string[]) {
  if (existingIds.length !== submittedIds.length) return false;
  if (new Set(submittedIds).size !== submittedIds.length) return false;
  const submitted = new Set(submittedIds);
  return existingIds.every((id) => submitted.has(id));
}
