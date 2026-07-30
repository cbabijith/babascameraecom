import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleValues = ["customer", "admin"] as const;
export const orderStatusValues = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export const paymentMethodValues = ["razorpay", "cod"] as const;
export const paymentStatusValues = ["pending", "paid", "failed", "refunded"] as const;
export const couponTypeValues = ["percentage", "flat"] as const;
export const couponRedemptionStatusValues = ["reserved", "applied", "released"] as const;
export const paymentEventOutcomeValues = ["pending", "processed", "ignored", "failed"] as const;
export const refundStatusValues = [
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export const emailOutboxStatusValues = ["pending", "processing", "sent", "failed"] as const;
export const inventoryReservationStatusValues = ["reserved", "consumed", "released"] as const;

export const userRoleEnum = pgEnum("user_role", userRoleValues);
export const orderStatusEnum = pgEnum("order_status", orderStatusValues);
export const paymentMethodEnum = pgEnum("payment_method", paymentMethodValues);
export const paymentStatusEnum = pgEnum("payment_status", paymentStatusValues);
export const couponTypeEnum = pgEnum("coupon_type", couponTypeValues);
export const couponRedemptionStatusEnum = pgEnum(
  "coupon_redemption_status",
  couponRedemptionStatusValues,
);
export const paymentEventOutcomeEnum = pgEnum("payment_event_outcome", paymentEventOutcomeValues);
export const refundStatusEnum = pgEnum("refund_status", refundStatusValues);
export const emailOutboxStatusEnum = pgEnum("email_outbox_status", emailOutboxStatusValues);
export const inventoryReservationStatusEnum = pgEnum(
  "inventory_reservation_status",
  inventoryReservationStatusValues,
);

export type UserRole = (typeof userRoleValues)[number];
export type OrderStatus = (typeof orderStatusValues)[number];
export type PaymentMethod = (typeof paymentMethodValues)[number];
export type PaymentStatus = (typeof paymentStatusValues)[number];
export type CouponType = (typeof couponTypeValues)[number];
export type CouponRedemptionStatus = (typeof couponRedemptionStatusValues)[number];
export type PaymentEventOutcome = (typeof paymentEventOutcomeValues)[number];
export type RefundStatus = (typeof refundStatusValues)[number];
export type EmailOutboxStatus = (typeof emailOutboxStatusValues)[number];
export type InventoryReservationStatus = (typeof inventoryReservationStatusValues)[number];
