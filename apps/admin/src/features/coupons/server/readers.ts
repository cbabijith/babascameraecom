import { db } from "@babascamera/db";

import { requirePermission } from "@/features/auth/server/admin";

function iso(value: Date) {
  return value.toISOString();
}

export async function getCoupons() {
  await requirePermission("promotions");
  const rows = await db.query.coupons.findMany({
    orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
  });
  return rows.map((row) => ({
    ...row,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    expiresAt: row.expiresAt ? iso(row.expiresAt) : null,
  }));
}
