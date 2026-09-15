import { count, db, users as usersTable } from "@babascamera/db";

import { buildPaginationMeta, clampPagination, type Paginated } from "@/features/orders/repositories/orders-repository";

import { requirePermission } from "@/features/auth/server/admin";

function iso(value: Date) {
  return value.toISOString();
}

export async function getUsers(
  options: { page?: number; pageSize?: number } = {},
): Promise<Paginated<{
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: "customer" | "admin";
  isActive: boolean;
  orderCount: number;
  createdAt: string;
}>> {
  await requirePermission("users");
  const { page, pageSize } = clampPagination(options);
  const [rows, totalRows] = await Promise.all([
    db.query.users.findMany({
      with: { orders: { columns: { id: true } } },
      orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ value: count() }).from(usersTable),
  ]);
  const total = totalRows[0]?.value ?? 0;
  return {
    ...buildPaginationMeta(total, page, pageSize),
    rows: rows.map((row) => ({
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      phone: row.phone,
      role: row.role as "customer" | "admin",
      isActive: row.isActive,
      orderCount: row.orders.length,
      createdAt: iso(row.createdAt),
    })),
  };
}
