import {
  couponRedemptions,
  coupons,
  db,
  emailOutbox,
  eq,
  inventoryReservations,
  orderItems,
  orderStatusHistory,
  orders,
  products,
  productVariants,
  refunds,
  sql,
  users,
  type OrderStatus,
  type PaymentStatus,
  type ShippingAddressSnapshot,
} from "@babascamera/db";
import { randomInt } from "node:crypto";

import { canTransitionOrder } from "../domain/order-transitions";
import type {
  ManualOrderInput,
  OrderTransitionInput,
  PaymentStatusInput,
} from "../schemas/order-schemas";
import { AdminActionError } from "@/lib/actions/result";
import { adminEvents, domainEvent } from "@/lib/events";
import { optionalText } from "@/lib/utils";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/* ------------------------------------------------------------------ */
/* Status transition                                                   */
/* ------------------------------------------------------------------ */

export async function transitionOrderStatus(
  input: OrderTransitionInput,
  adminId: string,
): Promise<{ orderId: string; status: OrderStatus }> {
  const { orderId, toStatus } = input;
  const note = optionalText(input.note ?? null);
  const carrier = optionalText(input.carrier ?? null);
  const trackingNumber = optionalText(input.trackingNumber ?? null);
  const trackingUrl = optionalText(input.trackingUrl ?? null);

  if (toStatus === "shipped" && (!carrier || !trackingNumber)) {
    throw new AdminActionError("Carrier and tracking number are required before shipping.");
  }
  if (trackingUrl) {
    let tracking: URL;
    try {
      tracking = new URL(trackingUrl);
    } catch {
      throw new AdminActionError("Tracking URL must be a valid HTTP or HTTPS URL.");
    }
    if (!["http:", "https:"].includes(tracking.protocol)) {
      throw new AdminActionError("Tracking URL must use HTTPS or HTTP.");
    }
  }

  const completed = await db.transaction(async (tx) => {
    await tx.execute(sql`select id from orders where id = ${orderId} for update`);
    const order = await tx.query.orders.findFirst({
      where: (table, { eq: equals }) => equals(table.id, orderId),
    });
    if (!order) throw new AdminActionError("Order not found.");
    if (!canTransitionOrder(order.status, toStatus)) {
      throw new AdminActionError(`Order cannot move from ${order.status} to ${toStatus}.`);
    }
    const now = new Date();
    await tx.update(orders).set({
      status: toStatus,
      carrier: toStatus === "shipped" ? carrier : order.carrier,
      trackingNumber: toStatus === "shipped" ? trackingNumber : order.trackingNumber,
      trackingUrl: toStatus === "shipped" ? trackingUrl : order.trackingUrl,
      shippedAt: toStatus === "shipped" ? now : order.shippedAt,
      deliveredAt: toStatus === "delivered" ? now : order.deliveredAt,
      paymentStatus:
        toStatus === "delivered" && order.paymentMethod === "cod" ? "paid" : order.paymentStatus,
      updatedAt: now,
    }).where(eq(orders.id, orderId));
    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: order.status,
      toStatus,
      note,
      actorId: adminId,
    });
    if (toStatus === "cancelled") {
      await releaseOrderInventory(tx, orderId, now);
      await releaseOrderCouponRedemptions(tx, orderId, now);
    }
    return {
      from: order.status,
      to: toStatus,
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      userId: order.userId,
    };
  });

  await adminEvents.emit(
    domainEvent("order.status_changed", {
      actorId: adminId,
      orderId,
      orderNumber: completed.orderNumber,
      from: completed.from,
      to: completed.to,
      customerEmail: completed.customerEmail,
      userId: completed.userId,
    }),
  );

  return { orderId, status: toStatus };
}

/* ------------------------------------------------------------------ */
/* Payment status                                                      */
/* ------------------------------------------------------------------ */

export async function updateOrderPaymentStatus(
  input: PaymentStatusInput,
  adminId: string,
): Promise<{ orderId: string; paymentStatus: PaymentStatus }> {
  const { orderId, paymentStatus } = input;
  const note = optionalText(input.note ?? null);

  const completed = await db.transaction(async (tx) => {
    await tx.execute(sql`select id from orders where id = ${orderId} for update`);
    const order = await tx.query.orders.findFirst({
      where: (table, { eq: equals }) => equals(table.id, orderId),
    });
    if (!order) throw new AdminActionError("Order not found.");

    const now = new Date();
    await tx
      .update(orders)
      .set({ paymentStatus, updatedAt: now })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      fromStatus: null,
      toStatus: order.status,
      note: note ?? `Payment status updated from ${order.paymentStatus} to ${paymentStatus}.`,
      actorId: adminId,
    });
    return {
      from: order.paymentStatus,
      orderNumber: order.orderNumber,
    };
  });

  await adminEvents.emit(
    domainEvent("order.payment_status_changed", {
      actorId: adminId,
      orderId,
      orderNumber: completed.orderNumber,
      from: completed.from,
      to: paymentStatus,
    }),
  );

  return { orderId, paymentStatus };
}

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

export async function deleteOrder(orderId: string, adminId?: string): Promise<{ orderId: string }> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select id from orders where id = ${orderId} for update`);
    const order = await tx.query.orders.findFirst({
      where: (table, { eq: equals }) => equals(table.id, orderId),
    });
    if (!order) throw new AdminActionError("Order not found.");

    const now = new Date();

    // Release inventory if the order was not delivered or already cancelled
    if (!["cancelled", "delivered"].includes(order.status)) {
      const releasable = await tx.query.inventoryReservations.findMany({
        where: (table, { and, eq: equals, inArray: inValues }) =>
          and(
            equals(table.orderId, orderId),
            inValues(table.status, ["reserved", "consumed"]),
          ),
      });
      for (const reservation of releasable) {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} + ${reservation.quantity}`, updatedAt: now })
          .where(eq(products.id, reservation.productId));
        if (reservation.variantId) {
          await tx
            .update(productVariants)
            .set({
              stock: sql`${productVariants.stock} + ${reservation.quantity}`,
              updatedAt: now,
            })
            .where(eq(productVariants.id, reservation.variantId));
        }
      }
    }

    // Roll back coupon usage counts for un-released redemptions
    const redemptions = await tx.query.couponRedemptions.findMany({
      where: (table, { and, eq: equals, inArray: inValues }) =>
        and(
          equals(table.orderId, orderId),
          inValues(table.status, ["reserved", "applied"]),
        ),
    });
    for (const redemption of redemptions) {
      await tx
        .update(coupons)
        .set({
          usedCount: sql`greatest(${coupons.usedCount} - 1, 0)`,
          updatedAt: now,
        })
        .where(eq(coupons.id, redemption.couponId));
    }

    // Delete dependent records
    await tx.delete(refunds).where(eq(refunds.orderId, orderId));
    await tx.delete(inventoryReservations).where(eq(inventoryReservations.orderId, orderId));
    await tx.delete(couponRedemptions).where(eq(couponRedemptions.orderId, orderId));
    await tx.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId));
    await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await tx.delete(emailOutbox).where(eq(emailOutbox.orderId, orderId));
    await tx.delete(orders).where(eq(orders.id, orderId));
  });

  await adminEvents.emit(
    domainEvent("order.deleted", { actorId: adminId, orderId }),
  );

  return { orderId };
}

/* ------------------------------------------------------------------ */
/* Manual order creation                                               */
/* ------------------------------------------------------------------ */

const MANUAL_RESERVATION_TTL_DAYS = 30;

function cents(value: number) {
  return Math.round(value * 100);
}

function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = randomInt(1000, 10000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

interface ResolvedManualItem {
  productId: string;
  variantId: string | null;
  productName: string;
  variantLabel: string | null;
  sku: string;
  quantity: number;
  unitPriceCents: number;
}

export async function createManualOrder(
  input: ManualOrderInput,
  adminId: string,
): Promise<{ orderId: string; orderNumber: string }> {
  /* Resolve catalog data and compute totals before opening the write tx. */
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const productRows = await db.query.products.findMany({
    where: (table, { inArray: includes }) => includes(table.id, productIds),
  });
  const productById = new Map(productRows.map((row) => [row.id, row]));

  const variantIds = [
    ...new Set(input.items.map((item) => item.variantId).filter((id): id is string => !!id)),
  ];
  const variantRows = variantIds.length
    ? await db.query.productVariants.findMany({
        where: (table, { inArray: includes }) => includes(table.id, variantIds),
      })
    : [];
  const variantById = new Map(variantRows.map((row) => [row.id, row]));

  const resolvedItems: ResolvedManualItem[] = [];
  for (const item of input.items) {
    const product = productById.get(item.productId);
    if (!product) throw new AdminActionError(`Product ${item.productId} was not found.`);
    if (!product.isActive) {
      throw new AdminActionError(`Product "${product.name}" is inactive and cannot be ordered.`);
    }
    let variant = null;
    if (item.variantId) {
      variant = variantById.get(item.variantId) ?? null;
      if (!variant || variant.productId !== product.id) {
        throw new AdminActionError("Variant was not found for the selected product.");
      }
    }
    const unitPriceCents =
      cents(Number(product.salePrice)) + (variant ? cents(Number(variant.additionalPrice)) : 0);
    resolvedItems.push({
      productId: product.id,
      variantId: variant?.id ?? null,
      productName: product.name,
      variantLabel: variant ? `${variant.name}: ${variant.value}` : null,
      sku: variant?.sku ?? product.sku,
      quantity: item.quantity,
      unitPriceCents,
    });
  }

  /* One reservation + one order item per product/variant pair (unique index). */
  const merged = new Map<string, ResolvedManualItem>();
  for (const item of resolvedItems) {
    const key = `${item.productId}:${item.variantId ?? "-"}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.set(key, { ...item });
    }
  }
  const finalItems = [...merged.values()];

  const subtotalCents = finalItems.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const discountCents = cents(input.discount);
  const shippingCents = cents(input.shippingCharge);
  if (discountCents > subtotalCents) {
    throw new AdminActionError("Discount cannot be greater than the order subtotal.");
  }
  const totalCents = subtotalCents - discountCents + shippingCents;

  /* Link the order to an existing user by email when possible. */
  let userId = input.userId ?? null;
  if (!userId) {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${input.customerEmail.toLowerCase()}`);
    userId = existingUser?.id ?? null;
  }
  if (userId) {
    const [linked] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId));
    if (!linked) throw new AdminActionError("Linked user was not found.");
  }

  const addressSnapshot: ShippingAddressSnapshot = {
    fullName: input.shippingAddress.fullName,
    phone: input.shippingAddress.phone,
    ...(input.shippingAddress.label ? { label: input.shippingAddress.label } : {}),
    line1: input.shippingAddress.line1,
    ...(input.shippingAddress.line2 ? { line2: input.shippingAddress.line2 } : {}),
    city: input.shippingAddress.city,
    state: input.shippingAddress.state,
    pincode: input.shippingAddress.pincode,
    country: input.shippingAddress.country,
  };

  const expiresAt = new Date(Date.now() + MANUAL_RESERVATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const created = await db.transaction(async (tx) => {
    /* Lock every product row so concurrent orders cannot oversell stock. */
    for (const productId of productIds) {
      await tx.execute(
        sql`select id, stock from products where id = ${productId} for update`,
      );
    }
    for (const item of finalItems) {
      const [row] = await tx
        .select({ stock: products.stock })
        .from(products)
        .where(eq(products.id, item.productId));
      if (!row || row.stock < item.quantity) {
        throw new AdminActionError(
          `Insufficient stock for "${item.productName}"${item.variantLabel ? ` (${item.variantLabel})` : ""}.`,
        );
      }
      if (item.variantId) {
        await tx.execute(
          sql`select id, stock from product_variants where id = ${item.variantId} for update`,
        );
        const [variantRow] = await tx
          .select({ stock: productVariants.stock })
          .from(productVariants)
          .where(eq(productVariants.id, item.variantId));
        if (!variantRow || variantRow.stock < item.quantity) {
          throw new AdminActionError(
            `Insufficient variant stock for "${item.productName}" (${item.variantLabel}).`,
          );
        }
      }
    }

    const now = new Date();
    let createdRow: { id: string; orderNumber: string } | null = null;
    for (let attempt = 0; attempt < 3 && !createdRow; attempt += 1) {
      const [row] = await tx
        .insert(orders)
        .values({
          orderNumber: generateOrderNumber(),
          userId,
          status: "pending",
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentStatus,
          customerEmail: input.customerEmail.toLowerCase(),
          customerName: input.customerName,
          customerPhone: input.customerPhone ?? "",
          subtotal: (subtotalCents / 100).toFixed(2),
          discount: (discountCents / 100).toFixed(2),
          shippingCharge: (shippingCents / 100).toFixed(2),
          total: (totalCents / 100).toFixed(2),
          notes: optionalText(input.notes ?? ""),
          shippingAddressSnapshot: addressSnapshot,
        })
        .onConflictDoNothing()
        .returning({ id: orders.id, orderNumber: orders.orderNumber });
      createdRow = row ?? null;
    }
    if (!createdRow) throw new AdminActionError("Could not generate a unique order number. Try again.");

    for (const item of finalItems) {
      await tx.insert(orderItems).values({
        orderId: createdRow.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        variantLabel: item.variantLabel,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: (item.unitPriceCents / 100).toFixed(2),
        total: ((item.unitPriceCents * item.quantity) / 100).toFixed(2),
      });
      await tx.insert(inventoryReservations).values({
        orderId: createdRow.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        status: "reserved",
        expiresAt,
      });
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}`, updatedAt: now })
        .where(eq(products.id, item.productId));
      if (item.variantId) {
        await tx
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} - ${item.quantity}`, updatedAt: now })
          .where(eq(productVariants.id, item.variantId));
      }
    }

    await tx.insert(orderStatusHistory).values({
      orderId: createdRow.id,
      fromStatus: null,
      toStatus: "pending",
      note: "Order created manually from the admin panel.",
      actorId: adminId,
    });

    return createdRow;
  });

  await adminEvents.emit(
    domainEvent("order.created", {
      actorId: adminId,
      orderId: created.id,
      orderNumber: created.orderNumber,
    }),
  );

  return { orderId: created.id, orderNumber: created.orderNumber };
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

async function releaseOrderInventory(tx: Transaction, orderId: string, now: Date) {
  const releasable = await tx.query.inventoryReservations.findMany({
    where: (table, { and, eq: equals, inArray: inValues }) =>
      and(
        equals(table.orderId, orderId),
        inValues(table.status, ["reserved", "consumed"]),
      ),
  });
  for (const reservation of releasable) {
    await tx
      .update(products)
      .set({ stock: sql`${products.stock} + ${reservation.quantity}`, updatedAt: now })
      .where(eq(products.id, reservation.productId));
    if (reservation.variantId) {
      await tx
        .update(productVariants)
        .set({
          stock: sql`${productVariants.stock} + ${reservation.quantity}`,
          updatedAt: now,
        })
        .where(eq(productVariants.id, reservation.variantId));
    }
    await tx
      .update(inventoryReservations)
      .set({
        status: "released",
        consumedAt: null,
        releasedAt: now,
        updatedAt: now,
      })
      .where(eq(inventoryReservations.id, reservation.id));
  }
}

async function releaseOrderCouponRedemptions(tx: Transaction, orderId: string, now: Date) {
  const redemptions = await tx.query.couponRedemptions.findMany({
    where: (table, { and, eq: equals, inArray: inValues }) =>
      and(
        equals(table.orderId, orderId),
        inValues(table.status, ["reserved", "applied"]),
      ),
  });
  for (const redemption of redemptions) {
    await tx
      .update(couponRedemptions)
      .set({ status: "released", releasedAt: now, updatedAt: now })
      .where(eq(couponRedemptions.id, redemption.id));
    await tx
      .update(coupons)
      .set({
        usedCount: sql`greatest(${coupons.usedCount} - 1, 0)`,
        updatedAt: now,
      })
      .where(eq(coupons.id, redemption.couponId));
  }
}
