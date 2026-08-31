import { db, emailOutbox } from "@babascamera/db";

import type { AdminDomainEvents } from "../domain-events";
import type { EventBus } from "../event-bus";

type Bus = EventBus<AdminDomainEvents>;

/**
 * Turns order lifecycle events into customer emails on the shared outbox.
 * Inserts are keyed by a dedupe key, so event replays never queue a
 * duplicate email.
 */
export function registerEmailOutboxHandlers(bus: Bus): void {
  bus.on("order.status_changed", async (event) => {
    await db.insert(emailOutbox).values({
      orderId: event.orderId,
      userId: event.userId,
      toEmail: event.customerEmail,
      template: "order-status",
      subject: `Order ${event.orderNumber}: ${event.to}`,
      dedupeKey: `admin-status:${event.orderId}:${event.to}`,
      payload: { orderNumber: event.orderNumber, status: event.to },
    }).onConflictDoNothing();
  });

  bus.on("order.refund_issued", async (event) => {
    await db.insert(emailOutbox).values({
      orderId: event.orderId,
      userId: event.userId,
      toEmail: event.customerEmail,
      template: "order-refunded",
      subject: `Refund processed for ${event.orderNumber}`,
      dedupeKey: `admin-refund:${event.refundId}`,
      payload: {
        orderNumber: event.orderNumber,
        ...(event.providerRefundId ? { refundId: event.providerRefundId } : {}),
      },
    }).onConflictDoNothing();
  });
}
