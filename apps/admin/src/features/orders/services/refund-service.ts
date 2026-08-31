import {
  db,
  eq,
  inventoryReservations,
  orderStatusHistory,
  orders,
  products,
  productVariants,
  refunds,
  sql,
} from "@babascamera/db";

import { refundInputSchema } from "../schemas/order-schemas";
import { AdminActionError } from "@/lib/actions/result";
import { adminEvents, domainEvent } from "@/lib/events";
import { parseMoney } from "@/lib/money";
import { RazorpayRequestError, requestFullRefund } from "@/lib/razorpay";
import { requirePermission } from "@/features/auth/server/admin";

/**
 * Idempotent full refund for a paid Razorpay order. The provider call runs
 * outside the transaction; the final transaction reconciles the refund row,
 * restores unshipped inventory, flips the order to refunded, and records the
 * timeline entry. Customer email + page revalidation run as domain events
 * after commit.
 */
export async function processOrderRefund(orderIdInput: string, reasonInput?: string | null) {
  const admin = await requirePermission("orders");
  const parsed = refundInputSchema.safeParse({
    orderId: orderIdInput,
    ...(reasonInput === null || reasonInput === undefined ? {} : { reason: reasonInput }),
  });
  if (!parsed.success) throw new AdminActionError("The refund request is invalid.");
  const { orderId, reason } = parsed.data;

  const prepared = await db.transaction(async (tx) => {
    await tx.execute(sql`select id from orders where id = ${orderId} for update`);
    const order = await tx.query.orders.findFirst({
      where: (table, { eq: equals }) => equals(table.id, orderId),
    });
    if (!order) throw new AdminActionError("Order not found.");
    if (order.paymentMethod !== "razorpay" || order.paymentStatus !== "paid" || !order.razorpayPaymentId) {
      throw new AdminActionError("Only paid Razorpay orders with a verified payment ID can be refunded.");
    }
    const paymentId = order.razorpayPaymentId;
    const amountPaise = parseMoney(order.total).paise;
    if (amountPaise <= 0) throw new AdminActionError("The order has no refundable balance.");
    let refund = await tx.query.refunds.findFirst({
      where: (table, { eq: equals }) => equals(table.idempotencyKey, orderId),
    });
    if (!refund) {
      const inserted = await tx.insert(refunds).values({
        orderId,
        providerPaymentId: order.razorpayPaymentId,
        amount: order.total,
        status: "pending",
        reason,
        idempotencyKey: orderId,
      }).returning();
      refund = inserted[0];
    }
    if (!refund) throw new AdminActionError("Refund record could not be created.");
    if (refund.status === "succeeded") {
      return { done: true as const, order, refund, amountPaise, paymentId };
    }
    await tx.update(refunds).set({
      status: "processing",
      reason: reason ?? refund.reason,
      updatedAt: new Date(),
    }).where(eq(refunds.id, refund.id));
    return { done: false as const, order, refund, amountPaise, paymentId };
  });

  if (prepared.done) {
    await adminEvents.emit(
      domainEvent("order.refund_issued", {
        actorId: admin.id,
        orderId,
        orderNumber: prepared.order.orderNumber,
        refundId: prepared.refund.id,
        providerRefundId: prepared.refund.providerRefundId,
        customerEmail: prepared.order.customerEmail,
        userId: prepared.order.userId,
      }),
    );
    return;
  }

  let provider;
  try {
    provider = await requestFullRefund({
      paymentId: prepared.paymentId,
      amountPaise: prepared.amountPaise,
      idempotencyKey: orderId,
      orderId,
      providerRefundId: prepared.refund.providerRefundId,
    });
  } catch (error) {
    if (error instanceof RazorpayRequestError && error.definitive) {
      await db.update(refunds).set({
        status: "failed",
        updatedAt: new Date(),
      }).where(eq(refunds.id, prepared.refund.id));
    }
    throw error;
  }

  const settled = await db.transaction(async (tx) => {
    await tx.execute(sql`select id from orders where id = ${orderId} for update`);
    await tx.update(refunds).set({
      providerRefundId: provider.id,
      status:
        provider.status === "processed" ? "succeeded" :
        provider.status === "failed" ? "failed" : "processing",
      processedAt: provider.status === "processed" ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(refunds.id, prepared.refund.id));
    if (provider.status !== "processed") return null;
    const order = await tx.query.orders.findFirst({
      where: (table, { eq: equals }) => equals(table.id, orderId),
    });
    if (!order) throw new AdminActionError("Order disappeared while recording the refund.");
    if (order.paymentStatus !== "refunded") {
      if (order.status !== "shipped" && order.status !== "delivered") {
        const consumedReservations = await tx.query.inventoryReservations.findMany({
          where: (table, { and, eq: equals }) =>
            and(equals(table.orderId, orderId), equals(table.status, "consumed")),
        });
        for (const reservation of consumedReservations) {
          const restoredAt = new Date();
          await tx
            .update(products)
            .set({
              stock: sql`${products.stock} + ${reservation.quantity}`,
              updatedAt: restoredAt,
            })
            .where(eq(products.id, reservation.productId));
          if (reservation.variantId) {
            await tx
              .update(productVariants)
              .set({
                stock: sql`${productVariants.stock} + ${reservation.quantity}`,
                updatedAt: restoredAt,
              })
              .where(eq(productVariants.id, reservation.variantId));
          }
          await tx
            .update(inventoryReservations)
            .set({
              status: "released",
              consumedAt: null,
              releasedAt: restoredAt,
              updatedAt: restoredAt,
            })
            .where(eq(inventoryReservations.id, reservation.id));
        }
      }
      await tx.update(orders).set({
        status: "refunded",
        paymentStatus: "refunded",
        updatedAt: new Date(),
      }).where(eq(orders.id, orderId));
      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: order.status,
        toStatus: "refunded",
        note: reason ?? "Full Razorpay refund processed.",
        actorId: admin.id,
      });
      return {
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        userId: order.userId,
        from: order.status,
      };
    }
    return null;
  });

  if (settled) {
    await adminEvents.emit(
      domainEvent("order.status_changed", {
        actorId: admin.id,
        orderId,
        orderNumber: settled.orderNumber,
        from: settled.from,
        to: "refunded",
        customerEmail: settled.customerEmail,
        userId: settled.userId,
      }),
    );
    await adminEvents.emit(
      domainEvent("order.refund_issued", {
        actorId: admin.id,
        orderId,
        orderNumber: settled.orderNumber,
        refundId: prepared.refund.id,
        providerRefundId: provider.id,
        customerEmail: settled.customerEmail,
        userId: settled.userId,
      }),
    );
  }
}
