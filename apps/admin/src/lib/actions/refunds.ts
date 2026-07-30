"use server";

import {
  db,
  emailOutbox,
  eq,
  inventoryReservations,
  orderStatusHistory,
  orders,
  products,
  productVariants,
  refunds,
  sql,
} from "@babascamera/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  actionFailureFromError,
  actionSuccess,
  AdminActionError,
  type AdminActionResult,
  validationFailure,
} from "@/lib/actions/result";
import { requirePermission } from "@/lib/auth/admin";
import { parseMoney } from "@/lib/money";
import { RazorpayRequestError, requestFullRefund } from "@/lib/razorpay";

const refundInputSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().transform((value) => value || null),
});

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
    revalidatePath(`/orders/${orderId}`);
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
    revalidatePath(`/orders/${orderId}`);
    throw error;
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`select id from orders where id = ${orderId} for update`);
    await tx.update(refunds).set({
      providerRefundId: provider.id,
      status:
        provider.status === "processed" ? "succeeded" :
        provider.status === "failed" ? "failed" : "processing",
      processedAt: provider.status === "processed" ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(refunds.id, prepared.refund.id));
    if (provider.status !== "processed") return;
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
      await tx.insert(emailOutbox).values({
        orderId,
        userId: order.userId,
        toEmail: order.customerEmail,
        template: "order-refunded",
        subject: `Refund processed for ${order.orderNumber}`,
        dedupeKey: `admin-refund:${prepared.refund.id}`,
        payload: { orderNumber: order.orderNumber, refundId: provider.id },
      }).onConflictDoNothing();
    }
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
}

export async function refundOrderAction(formData: FormData): Promise<AdminActionResult<{ orderId: string }>> {
  await requirePermission("orders");
  const parsed = refundInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await processOrderRefund(parsed.data.orderId, parsed.data.reason);
    return actionSuccess({ orderId: parsed.data.orderId });
  } catch (error) {
    return actionFailureFromError(error, "Refund could not be completed.", "Order refund failed.");
  }
}
