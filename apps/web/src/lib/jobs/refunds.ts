import "server-only";

import {
  and,
  eq,
  getDatabase,
  inArray,
  inventoryReservations,
  moneyToPaise,
  orderStatusHistory,
  orders,
  products,
  productVariants,
  refunds,
  sql,
} from "@babascamera/db";
import {
  createOrFindRazorpayRefund,
  RazorpayOperationError,
} from "@/lib/payments/razorpay";

async function claimBatch(limit: number) {
  return getDatabase().transaction(async (transaction) => {
    const rows = await transaction
      .select()
      .from(refunds)
      .where(inArray(refunds.status, ["pending", "processing"]))
      .orderBy(refunds.createdAt)
      .limit(Math.min(Math.max(limit, 1), 25))
      .for("update", { skipLocked: true });
    for (const row of rows) {
      await transaction
        .update(refunds)
        .set({ status: "processing", updatedAt: new Date() })
        .where(
          and(
            eq(refunds.id, row.id),
            inArray(refunds.status, ["pending", "processing"]),
          ),
        );
    }
    return rows;
  });
}

export async function completeRefund(
  refundId: string,
  providerRefundId: string,
  providerStatus: "pending" | "processed" | "failed",
) {
  const status =
    providerStatus === "processed"
      ? "succeeded"
      : providerStatus === "failed"
        ? "failed"
        : "processing";
  await getDatabase().transaction(async (transaction) => {
    const [updated] = await transaction
      .update(refunds)
      .set({
        status,
        providerRefundId,
        processedAt: status === "succeeded" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(refunds.id, refundId))
      .returning();
    if (!updated || status !== "succeeded") return;
    const [order] = await transaction
      .select()
      .from(orders)
      .where(eq(orders.id, updated.orderId))
      .for("update")
      .limit(1);
    if (!order || moneyToPaise(updated.amount) !== moneyToPaise(order.total)) {
      return;
    }
    if (order.status !== "shipped" && order.status !== "delivered") {
      const released = await transaction
        .update(inventoryReservations)
        .set({
          status: "released",
          consumedAt: null,
          releasedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventoryReservations.orderId, order.id),
            eq(inventoryReservations.status, "consumed"),
          ),
        )
        .returning({
          productId: inventoryReservations.productId,
          variantId: inventoryReservations.variantId,
          quantity: inventoryReservations.quantity,
        });
      for (const reservation of released) {
        await transaction
          .update(products)
          .set({
            stock: sql`${products.stock} + ${reservation.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, reservation.productId));
        if (reservation.variantId) {
          await transaction
            .update(productVariants)
            .set({
              stock: sql`${productVariants.stock} + ${reservation.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(productVariants.id, reservation.variantId));
        }
      }
    }
    if (order.paymentStatus !== "refunded") {
      await transaction
        .update(orders)
        .set({
          status: "refunded",
          paymentStatus: "refunded",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
      if (order.status !== "refunded") {
        await transaction.insert(orderStatusHistory).values({
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "refunded",
          note: "Full Razorpay refund processed",
        });
      }
    }
  });
}

export async function processPendingRefunds(limit = 10) {
  const rows = await claimBatch(limit);
  let processed = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const provider = await createOrFindRazorpayRefund({
        providerPaymentId: row.providerPaymentId,
        amountPaise: moneyToPaise(row.amount),
        idempotencyKey: row.idempotencyKey,
        localOrderId: row.orderId,
      });
      await completeRefund(row.id, provider.id, provider.status);
      processed += 1;
    } catch (error) {
      await getDatabase()
        .update(refunds)
        .set({
          status:
            error instanceof RazorpayOperationError && error.definitive
              ? "failed"
              : "pending",
          updatedAt: new Date(),
        })
        .where(eq(refunds.id, row.id));
      failed += 1;
    }
  }
  return { claimed: rows.length, processed, failed };
}
