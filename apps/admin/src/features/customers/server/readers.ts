import { db } from "@babascamera/db";

import { requirePermission } from "@/features/auth/server/admin";
import { parseMoney } from "@/lib/money";

function iso(value: Date) {
  return value.toISOString();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getCustomers() {
  await requirePermission("customers");
  const rows = await db.query.users.findMany({
    where: (table, { eq: equals }) => equals(table.role, "customer"),
    with: { orders: { columns: { id: true, total: true } } },
    orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    isActive: row.isActive,
    orderCount: row.orders.length,
    lifetimeValue: row.orders
      .reduce((sum, order) => sum + BigInt(parseMoney(order.total).paise), 0n)
      .toString(),
    createdAt: iso(row.createdAt),
  }));
}

export async function getCustomer(id: string) {
  await requirePermission("customers");
  if (!isUuid(id)) return null;
  const row = await db.query.users.findFirst({
    where: (table, { and, eq: equals }) => and(equals(table.id, id), equals(table.role, "customer")),
    with: {
      addresses: { orderBy: (table, { desc: descending }) => [descending(table.isDefault)] },
      orders: { orderBy: (table, { desc: descending }) => [descending(table.createdAt)] },
      reviews: {
        with: { product: { columns: { name: true } } },
        orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
      },
    },
  });
  if (!row) return null;
  return {
    ...row,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    addresses: row.addresses.map((address) => ({
      ...address, createdAt: iso(address.createdAt), updatedAt: iso(address.updatedAt),
    })),
    orders: row.orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: iso(order.createdAt),
    })),
    reviews: row.reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      isApproved: review.isApproved,
      productName: review.product.name,
      createdAt: iso(review.createdAt),
    })),
  };
}
