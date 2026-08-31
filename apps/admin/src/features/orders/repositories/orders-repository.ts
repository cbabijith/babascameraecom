import { db } from "@babascamera/db";

function iso(value: Date) {
  return value.toISOString();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Compact rows for the orders list surface. */
export async function listOrders() {
  const rows = await db.query.orders.findMany({
    with: { items: { columns: { id: true, quantity: true } } },
    orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
  });
  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    customer: row.customerName ?? row.customerEmail,
    customerEmail: row.customerEmail,
    status: row.status,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    total: row.total,
    itemCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: iso(row.createdAt),
  }));
}

/** Full order detail with items, status timeline, and refunds. */
export async function getOrderDetail(id: string) {
  if (!isUuid(id)) return null;
  const row = await db.query.orders.findFirst({
    where: (table, { eq: equals }) => equals(table.id, id),
    with: {
      items: true,
      statusHistory: {
        with: { actor: { columns: { fullName: true, email: true } } },
        orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
      },
      refunds: { orderBy: (table, { desc: descending }) => [descending(table.createdAt)] },
    },
  });
  if (!row) return null;
  return {
    ...row,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    shippedAt: row.shippedAt ? iso(row.shippedAt) : null,
    deliveredAt: row.deliveredAt ? iso(row.deliveredAt) : null,
    items: row.items.map((item) => ({
      ...item,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
    })),
    statusHistory: row.statusHistory.map((item) => ({
      ...item,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
      actorName: item.actor?.fullName ?? item.actor?.email ?? "System",
    })),
    refunds: row.refunds.map((item) => ({
      ...item,
      createdAt: iso(item.createdAt),
      updatedAt: iso(item.updatedAt),
      processedAt: item.processedAt ? iso(item.processedAt) : null,
    })),
  };
}
