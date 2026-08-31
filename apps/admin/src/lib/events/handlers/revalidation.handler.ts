import { revalidatePath } from "next/cache";

import type { AdminDomainEvents } from "../domain-events";
import type { EventBus } from "../event-bus";

type Bus = EventBus<AdminDomainEvents>;

/**
 * Keeps admin pages fresh after domain mutations. Handlers must stay
 * idempotent: replays revalidate the same paths, which is harmless.
 */
export function registerRevalidationHandlers(bus: Bus): void {
  bus.on("order.created", () => {
    revalidatePath("/orders");
  });
  bus.on("order.status_changed", (event) => {
    revalidatePath("/orders");
    revalidatePath(`/orders/${event.orderId}`);
  });
  bus.on("order.payment_status_changed", (event) => {
    revalidatePath("/orders");
    revalidatePath(`/orders/${event.orderId}`);
  });
  bus.on("order.deleted", () => {
    revalidatePath("/orders");
  });
  bus.on("order.refund_issued", (event) => {
    revalidatePath("/orders");
    revalidatePath(`/orders/${event.orderId}`);
  });
  bus.on("customer.status_changed", (event) => {
    revalidatePath("/customers");
    revalidatePath(`/customers/${event.customerId}`);
  });
  bus.on("user.role_changed", () => {
    revalidatePath("/users");
    revalidatePath("/customers");
  });
  bus.on("coupon.changed", () => {
    revalidatePath("/coupons");
  });
  bus.on("review.changed", () => {
    revalidatePath("/reviews");
  });
  bus.on("settings.changed", () => {
    revalidatePath("/settings");
  });
}
