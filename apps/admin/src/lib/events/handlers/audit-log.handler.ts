import type { AdminDomainEvents } from "../domain-events";
import type { EventBus } from "../event-bus";

type Bus = EventBus<AdminDomainEvents>;

const AUDITED_EVENTS = [
  "order.created",
  "order.status_changed",
  "order.payment_status_changed",
  "order.deleted",
  "order.refund_issued",
  "customer.status_changed",
  "user.role_changed",
  "coupon.changed",
  "review.changed",
  "settings.changed",
] as const satisfies readonly (keyof AdminDomainEvents)[];

/**
 * Structured audit trail for every admin mutation. Order lifecycle history
 * is additionally persisted in `order_status_history` by the order service;
 * this handler covers the remaining surfaces uniformly.
 */
export function registerAuditLogHandler(bus: Bus): void {
  for (const type of AUDITED_EVENTS) {
    bus.on(type, (event) => {
      console.info("admin.audit", {
        type: event.type,
        actorId: event.actorId ?? null,
        occurredAt: event.occurredAt,
        ...summarize(event),
      });
    });
  }
}

function summarize(event: AdminDomainEvents[keyof AdminDomainEvents]): Record<string, unknown> {
  const { type: _type, occurredAt: _occurredAt, actorId: _actorId, ...rest } = event;
  return rest as Record<string, unknown>;
}
