import type { AdminDomainEvents } from "./domain-events";
import { createEventBus, type EventBus } from "./event-bus";
import { registerAuditLogHandler } from "./handlers/audit-log.handler";
import { registerEmailOutboxHandlers } from "./handlers/email-outbox.handler";
import { registerRevalidationHandlers } from "./handlers/revalidation.handler";

/**
 * Process-wide admin event bus. Services emit domain events after their
 * transactions commit; the registered handlers own the side effects
 * (page revalidation, customer emails, audit logging).
 */
const singleton = globalThis as typeof globalThis & {
  __babasAdminEventBus?: EventBus<AdminDomainEvents>;
  __babasAdminEventHandlersReady?: boolean;
};

function createAdminEventBus(): EventBus<AdminDomainEvents> {
  const bus = createEventBus<AdminDomainEvents>();
  if (!singleton.__babasAdminEventHandlersReady) {
    registerRevalidationHandlers(bus);
    registerEmailOutboxHandlers(bus);
    registerAuditLogHandler(bus);
    singleton.__babasAdminEventHandlersReady = true;
  }
  return bus;
}

export const adminEvents: EventBus<AdminDomainEvents> =
  singleton.__babasAdminEventBus ??= createAdminEventBus();

export function domainEvent<K extends keyof AdminDomainEvents & string>(
  type: K,
  payload: Omit<AdminDomainEvents[K], "type" | "occurredAt">,
): AdminDomainEvents[K] {
  return {
    type,
    occurredAt: new Date().toISOString(),
    ...payload,
  } as AdminDomainEvents[K];
}

export type { AdminDomainEvents } from "./domain-events";
export type { EventBus } from "./event-bus";
