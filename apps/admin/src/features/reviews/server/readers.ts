import { db } from "@babascamera/db";

import { requirePermission } from "@/features/auth/server/admin";

function iso(value: Date) {
  return value.toISOString();
}

export async function getReviews() {
  await requirePermission("reviews");
  const rows = await db.query.reviews.findMany({
    with: {
      product: { columns: { name: true } },
      user: { columns: { fullName: true, email: true } },
    },
    orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
  });
  return rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    isApproved: row.isApproved,
    productName: row.product.name,
    customerName: row.user.fullName ?? row.user.email,
    createdAt: iso(row.createdAt),
  }));
}
