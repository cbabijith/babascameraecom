import { count, db, orders as ordersTable } from "@babascamera/db";

function iso(value: Date) {
  return value.toISOString();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export function clampPagination(input: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, Math.floor(Number(input.page) || 1));
  const pageSize = Math.min(Math.max(1, Math.floor(Number(input.pageSize) || 50)), 100);
  return { page, pageSize };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta {
  return {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Compact rows for the orders list surface, newest first, paginated. */
export async function listOrders(
  options: { page?: number; pageSize?: number } = {},
): Promise<Paginated<{
  id: string;
  orderNumber: string;
  customer: string;
  customerEmail: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: string;
  itemCount: number;
  createdAt: string;
}>> {
  const { page, pageSize } = clampPagination(options);
  const [rows, totalRows] = await Promise.all([
    db.query.orders.findMany({
      with: { items: { columns: { id: true, quantity: true } } },
      orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db.select({ value: count() }).from(ordersTable),
  ]);
  const total = totalRows[0]?.value ?? 0;
  return {
    ...buildPaginationMeta(total, page, pageSize),
    rows: rows.map((row) => ({
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
    })),
  };
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
