import type { DomainEventMeta } from "./event-bus";

export interface AdminDomainEvents {
  "order.created": DomainEventMeta & {
    readonly orderId: string;
    readonly orderNumber: string;
  };
  "order.status_changed": DomainEventMeta & {
    readonly orderId: string;
    readonly orderNumber: string;
    readonly from: string;
    readonly to: string;
    readonly customerEmail: string;
    readonly userId: string | null;
  };
  "order.payment_status_changed": DomainEventMeta & {
    readonly orderId: string;
    readonly orderNumber: string;
    readonly from: string;
    readonly to: string;
  };
  "order.deleted": DomainEventMeta & {
    readonly orderId: string;
  };
  "order.refund_issued": DomainEventMeta & {
    readonly orderId: string;
    readonly orderNumber: string;
    readonly refundId: string;
    readonly providerRefundId: string | null;
    readonly customerEmail: string;
    readonly userId: string | null;
  };
  "customer.status_changed": DomainEventMeta & {
    readonly customerId: string;
    readonly isActive: boolean;
  };
  "user.role_changed": DomainEventMeta & {
    readonly userId: string;
    readonly role: "customer" | "admin";
  };
  "coupon.changed": DomainEventMeta & {
    readonly couponId: string | null;
    readonly code: string;
    readonly action: "saved" | "disabled";
  };
  "review.changed": DomainEventMeta & {
    readonly reviewId: string;
    readonly action: "approved" | "hidden" | "deleted";
  };
  "settings.changed": DomainEventMeta & {
    readonly key: string;
  };
}
