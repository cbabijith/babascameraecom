import { z } from "zod";

export const checkoutInputSchema = z.object({
  addressId: z.uuid().optional(),
  guest: z
    .object({
      email: z.email().max(320),
      fullName: z.string().trim().min(2).max(100),
      phone: z.string().trim().regex(/^[+0-9 ()-]{8,20}$/),
      label: z.string().trim().min(2).max(40).default("Delivery"),
      line1: z.string().trim().min(5).max(180),
      line2: z.string().trim().max(180).optional(),
      city: z.string().trim().min(2).max(80),
      state: z.string().trim().min(2).max(80),
      pincode: z.string().trim().regex(/^\d{6}$/),
      country: z.string().trim().min(2).max(80).default("India"),
    })
    .optional(),
  paymentMethod: z.enum(["razorpay", "cod"]),
  couponCode: z
    .string()
    .trim()
    .max(40)
    .regex(/^[A-Za-z0-9_-]*$/, "Coupon code is invalid.")
    .transform((value) => value.toUpperCase())
    .optional(),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: z.uuid(),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type CheckoutFormInput = z.input<typeof checkoutInputSchema>;
