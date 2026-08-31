import { db } from "@babascamera/db";

import { requirePermission } from "@/features/auth/server/admin";
import { parseMoney } from "@/lib/money";

function iso(value: Date) {
  return value.toISOString();
}

export async function getDashboard() {
  await requirePermission("dashboard");
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 29);
  const [recentOrders, products, customers, pendingReviews, lowStock] = await Promise.all([
    db.query.orders.findMany({
      where: (table, { gte: after }) => after(table.createdAt, start),
      columns: { id: true, total: true, paymentStatus: true, createdAt: true, status: true },
      orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
    }),
    db.query.products.findMany({ columns: { id: true } }),
    db.query.users.findMany({
      where: (table, { eq: equals }) => equals(table.role, "customer"),
      columns: { id: true },
    }),
    db.query.reviews.findMany({
      where: (table, { eq: equals }) => equals(table.isApproved, false),
      columns: { id: true },
    }),
    db.query.products.findMany({
      where: (table, { lte: atMost }) => atMost(table.stock, table.lowStockThreshold),
      columns: { id: true },
    }),
  ]);

  const points = Array.from({ length: 30 }, (_, offset) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + offset);
    const key = date.toISOString().slice(0, 10);
    const dayOrders = recentOrders.filter((order) => iso(order.createdAt).slice(0, 10) === key);
    return {
      label: new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date),
      orders: dayOrders.length,
      revenuePaise: dayOrders
        .filter((order) => order.paymentStatus === "paid")
        .reduce((sum, order) => sum + parseMoney(order.total).paise, 0),
    };
  });
  const paidRevenuePaise = recentOrders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + parseMoney(order.total).paise, 0);
  return {
    recentOrders: recentOrders.slice(0, 8).map((order) => ({
      ...order,
      createdAt: iso(order.createdAt),
    })),
    metrics: {
      orders: recentOrders.length,
      paidRevenuePaise,
      products: products.length,
      customers: customers.length,
      pendingReviews: pendingReviews.length,
      lowStock: lowStock.length,
    },
    points,
  };
}
