import { db } from "@babascamera/db";

import { requirePermission } from "@/features/auth/server/admin";

function iso(value: Date) {
  return value.toISOString();
}

export async function getUsers() {
  await requirePermission("users");
  const rows = await db.query.users.findMany({
    with: { orders: { columns: { id: true } } },
    orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    role: row.role,
    isActive: row.isActive,
    orderCount: row.orders.length,
    createdAt: iso(row.createdAt),
  }));
}
