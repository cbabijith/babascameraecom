import { asc, count, db, eq, homeBanners, inArray, sql } from "@babascamera/db";

import type { HomeBannerInput } from "../types";

const MAX_BANNERS = 5;

export async function listHomeBanners() {
  return db.select().from(homeBanners).orderBy(asc(homeBanners.position));
}

export async function findHomeBanner(id: string) {
  const [row] = await db.select().from(homeBanners).where(eq(homeBanners.id, id)).limit(1);
  return row ?? null;
}

export async function createHomeBanner(input: HomeBannerInput) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('home_banners_write'))`);
    const [{ total = 0 } = {}] = await tx.select({ total: count() }).from(homeBanners);
    if (total >= MAX_BANNERS) throw new Error("BANNER_LIMIT_REACHED");
    const [created] = await tx.insert(homeBanners).values({
      ...input,
      position: total,
    }).returning();
    if (!created) throw new Error("BANNER_CREATE_FAILED");
    return created;
  });
}

export async function updateHomeBanner(id: string, input: HomeBannerInput) {
  const [updated] = await db.update(homeBanners).set({
    ...input,
    updatedAt: new Date(),
  }).where(eq(homeBanners.id, id)).returning();
  return updated ?? null;
}

export async function deleteHomeBanner(id: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('home_banners_write'))`);
    const [deleted] = await tx.delete(homeBanners).where(eq(homeBanners.id, id)).returning();
    if (!deleted) return null;
    const remaining = await tx.select({ id: homeBanners.id })
      .from(homeBanners)
      .orderBy(asc(homeBanners.position));
    for (const [position, banner] of remaining.entries()) {
      await tx.update(homeBanners).set({ position, updatedAt: new Date() })
        .where(eq(homeBanners.id, banner.id));
    }
    return deleted;
  });
}

export async function reorderHomeBanners(ids: string[]) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('home_banners_write'))`);
    const rows = await tx.select({ id: homeBanners.id }).from(homeBanners)
      .where(inArray(homeBanners.id, ids));
    if (rows.length !== ids.length || new Set(ids).size !== ids.length) {
      throw new Error("BANNER_ORDER_INVALID");
    }
    const all = await tx.select({ id: homeBanners.id }).from(homeBanners);
    if (all.length !== ids.length) throw new Error("BANNER_ORDER_INCOMPLETE");

    await tx.execute(sql`drop index if exists home_banners_position_unique`);
    const cases = ids.map((id, position) => sql`WHEN ${homeBanners.id} = ${id}::uuid THEN ${position}::integer`);
    await tx.update(homeBanners).set({
      position: sql`(CASE ${sql.join(cases, sql` `)} END)::integer`,
      updatedAt: new Date(),
    }).where(inArray(homeBanners.id, ids));
    await tx.execute(sql`create unique index if not exists home_banners_position_unique on home_banners (position)`);
  });
}
