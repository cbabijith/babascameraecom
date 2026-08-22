"use server";

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
  type OrderStatus,
  type PaymentStatus,
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
import { canTransitionOrder } from "@/lib/order-transitions";
import { optionalText } from "@/lib/utils";

const statusSchema = z.enum([
  "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded",
]);
const orderStatusFormSchema = z.object({
  orderId: z.string().uuid(),
  toStatus: statusSchema,
  note: z.string().max(500),
  carrier: z.string().max(100),
  trackingNumber: z.string().max(150),
  trackingUrl: z.string().max(2_000),
});

export async function updateOrderStatusAction(
  formData: FormData,
): Promise<AdminActionResult<{ orderId: string; status: OrderStatus }>> {
  const admin = await requirePermission("orders");
  const parsed = orderStatusFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { orderId, toStatus } = parsed.data;
  const note = optionalText(parsed.data.note);
  const carrier = optionalText(parsed.data.carrier);
  const trackingNumber = optionalText(parsed.data.trackingNumber);
  const trackingUrl = optionalText(parsed.data.trackingUrl);
  try {
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

    await db.transaction(async (tx) => {
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
        actorId: admin.id,
      });
      if (toStatus === "cancelled") {
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
            .set({
              stock: sql`${products.stock} + ${reservation.quantity}`,
              updatedAt: now,
            })
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
      await tx.insert(emailOutbox).values({
        orderId,
        userId: order.userId,
        toEmail: order.customerEmail,
        template: "order-status",
        subject: `Order ${order.orderNumber}: ${toStatus}`,
        dedupeKey: `admin-status:${orderId}:${toStatus}`,
        payload: { orderNumber: order.orderNumber, status: toStatus },
      }).onConflictDoNothing();
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return actionSuccess({ orderId, status: toStatus });
  } catch (error) {
    return actionFailureFromError(error, "Order status could not be updated.", "Order status update failed.");
  }
}

const paymentStatusSchema = z.enum(["pending", "paid", "failed", "refunded"]);
const updatePaymentStatusFormSchema = z.object({
  orderId: z.string().uuid(),
  paymentStatus: paymentStatusSchema,
  note: z.string().max(500).optional(),
});

export async function updatePaymentStatusAction(
  formData: FormData,
): Promise<AdminActionResult<{ orderId: string; paymentStatus: PaymentStatus }>> {
  const admin = await requirePermission("orders");
  const parsed = updatePaymentStatusFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { orderId, paymentStatus } = parsed.data;
  const note = optionalText(parsed.data.note as string);

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select id from orders where id = ${orderId} for update`);
      const order = await tx.query.orders.findFirst({
        where: (table, { eq: equals }) => equals(table.id, orderId),
      });
      if (!order) throw new AdminActionError("Order not found.");

      const now = new Date();
      await tx
        .update(orders)
        .set({
          paymentStatus,
          updatedAt: now,
        })
        .where(eq(orders.id, orderId));

      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: null,
        toStatus: order.status,
        note: note ?? `Payment status updated from ${order.paymentStatus} to ${paymentStatus}.`,
        actorId: admin.id,
      });
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return actionSuccess({ orderId, paymentStatus });
  } catch (error) {
    return actionFailureFromError(
      error,
      "Payment status could not be updated.",
      "Payment status update failed.",
    );
  }
}

const deleteOrderFormSchema = z.object({
  orderId: z.string().uuid(),
});

export async function deleteOrderAction(
  formData: FormData,
): Promise<AdminActionResult<{ orderId: string }>> {
  await requirePermission("orders");
  const parsed = deleteOrderFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const { orderId } = parsed.data;

  try {
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
            .set({
              stock: sql`${products.stock} + ${reservation.quantity}`,
              updatedAt: now,
            })
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

      // Release coupons if applied
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

    revalidatePath("/orders");
    return actionSuccess({ orderId });
  } catch (error) {
    return actionFailureFromError(
      error,
      "Order could not be deleted.",
      "Order deletion failed.",
    );
  }
}
