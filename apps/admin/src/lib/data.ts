import { db } from "@babascamera/db";

import { requirePermission } from "@/lib/auth/admin";
import { parseMoney } from "@/lib/money";

function iso(value: Date) {
  return value.toISOString();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getCatalogOptions() {
  await requirePermission("catalog");
  const [categories, brands] = await Promise.all([
    db.query.categories.findMany({
      columns: { id: true, name: true, isActive: true },
      orderBy: (table, { asc }) => [asc(table.name)],
    }),
    db.query.brands.findMany({
      columns: { id: true, name: true, isActive: true },
      orderBy: (table, { asc }) => [asc(table.name)],
    }),
  ]);
  return { categories, brands };
}

export async function getProducts() {
  await requirePermission("catalog");
  const rows = await db.query.products.findMany({
    with: {
      brand: { columns: { name: true } },
      category: { columns: { name: true } },
      images: {
        columns: { url: true, isPrimary: true, position: true },
        orderBy: (table, { asc }) => [asc(table.position)],
      },
      variants: { columns: { id: true } },
    },
    orderBy: (table, { desc: descending }) => [descending(table.createdAt)],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    slug: row.slug,
    salePrice: row.salePrice,
    mrp: row.mrp,
    stock: row.stock,
    threshold: row.lowStockThreshold,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    category: row.category.name,
    brand: row.brand.name,
    imageUrl: row.images.find((image) => image.isPrimary)?.url ?? row.images[0]?.url ?? null,
    variantCount: row.variants.length,
    createdAt: iso(row.createdAt),
  }));
}

export async function getProduct(id: string) {
  await requirePermission("catalog");
  if (!isUuid(id)) return null;
  const row = await db.query.products.findFirst({
    where: (table, { eq: equals }) => equals(table.id, id),
    with: {
      brand: { columns: { name: true } },
      category: { columns: { name: true } },
      images: { orderBy: (table, { asc }) => [asc(table.position)] },
      variants: { orderBy: (table, { asc }) => [asc(table.createdAt)] },
    },
  });
  if (!row) return null;
  return {
    ...row,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    images: row.images.map((image) => ({
      ...image,
      createdAt: iso(image.createdAt),
      updatedAt: iso(image.updatedAt),
    })),
    variants: row.variants.map((variant) => ({
      ...variant,
      createdAt: iso(variant.createdAt),
      updatedAt: iso(variant.updatedAt),
    })),
  };
}

export async function getCategories() {
  await requirePermission("catalog");
  const rows = await db.query.categories.findMany({
    with: {
      parent: { columns: { name: true } },
      products: { columns: { id: true } },
    },
    orderBy: (table, { asc }) => [asc(table.name)],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    parentId: row.parentId,
    parentName: row.parent?.name ?? null,
    isActive: row.isActive,
    productCount: row.products.length,
  }));
}

export async function getBrands() {
  await requirePermission("catalog");
  const rows = await db.query.brands.findMany({
    with: { products: { columns: { id: true } } },
    orderBy: (table, { asc }) => [asc(table.name)],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logoUrl: row.logoUrl,
    isActive: row.isActive,
    productCount: row.products.length,
  }));
}

export async function getOrders() {
  await requirePermission("orders");
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

export async function getOrder(id: string) {
  await requirePermission("orders");
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

export async function getSettings() {
  await requirePermission("settings");
  const rows = await db.query.settings.findMany({
    orderBy: (table, { asc }) => [asc(table.group), asc(table.key)],
  });
  return rows.map((row) => ({
    ...row,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    serializedValue: JSON.stringify(row.value, null, 2),
  }));
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
