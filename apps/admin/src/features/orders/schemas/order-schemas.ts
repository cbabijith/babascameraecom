import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Status transition                                                   */
/* ------------------------------------------------------------------ */

export const orderTransitionSchema = z.object({
  orderId: z.string().uuid(),
  toStatus: z.enum([
    "pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded",
  ]),
  note: z.string().max(500).optional(),
  carrier: z.string().max(100).optional(),
  trackingNumber: z.string().max(150).optional(),
  trackingUrl: z.string().max(2_000).optional(),
});
export type OrderTransitionInput = z.infer<typeof orderTransitionSchema>;

/* ------------------------------------------------------------------ */
/* Payment status                                                      */
/* ------------------------------------------------------------------ */

export const paymentStatusSchema = z.enum(["pending", "paid", "failed", "refunded"]);

export const paymentStatusInputSchema = z.object({
  orderId: z.string().uuid(),
  paymentStatus: paymentStatusSchema,
  note: z.string().max(500).optional(),
});
export type PaymentStatusInput = z.infer<typeof paymentStatusInputSchema>;

/* ------------------------------------------------------------------ */
/* Refund                                                              */
/* ------------------------------------------------------------------ */

export const refundInputSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().transform((value) => value || null),
});

/* ------------------------------------------------------------------ */
/* Manual order creation                                               */
/* ------------------------------------------------------------------ */

const moneyString = z
  .union([z.string(), z.number()])
  .transform((value) => Number(value))
  .refine((value) => Number.isFinite(value) && value >= 0 && value <= 99_999.99, {
    message: "Amount must be between 0 and 99999.99.",
  });

export const manualOrderItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullish(),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const manualOrderSchema = z.object({
  customerEmail: z.string().email().max(320),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().max(20).optional().default(""),
  userId: z.string().uuid().nullish(),
  items: z.array(manualOrderItemSchema).min(1).max(50),
  shippingAddress: z.object({
    fullName: z.string().min(1).max(200),
    phone: z.string().min(1).max(20),
    label: z.string().max(100).optional(),
    line1: z.string().min(1).max(500),
    line2: z.string().max(500).optional(),
    city: z.string().min(1).max(200),
    state: z.string().min(1).max(200),
    pincode: z.string().min(1).max(20),
    country: z.string().min(1).max(100),
  }),
  paymentMethod: z.enum(["cod", "razorpay"]),
  paymentStatus: z.enum(["pending", "paid"]).default("pending"),
  shippingCharge: moneyString.default(0),
  discount: moneyString.default(0),
  notes: z.string().max(500).optional(),
});
export type ManualOrderInput = z.infer<typeof manualOrderSchema>;
