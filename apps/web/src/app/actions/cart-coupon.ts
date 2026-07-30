"use server";

import { z } from "zod";
import { unstable_rethrow } from "next/navigation";
import { getCartOwner } from "@/lib/cart-session";
import {
  CommerceError,
  previewCartCoupon,
} from "@/lib/commerce/checkout";

const couponSchema = z
  .string()
  .trim()
  .min(1, "Enter a coupon code.")
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/, "Coupon code is invalid.")
  .transform((value) => value.toUpperCase());

export interface CartCouponState {
  ok: boolean;
  message: string;
  code: string | null;
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
}

export async function previewCartCouponAction(
  previous: CartCouponState,
  formData: FormData,
): Promise<CartCouponState> {
  const rawCode = String(formData.get("couponCode") ?? "").trim();
  if (!rawCode) {
    try {
      const result = await previewCartCoupon(await getCartOwner());
      return {
        ok: true,
        message: previous.code ? "Coupon removed." : "",
        ...result,
      };
    } catch (error) {
      unstable_rethrow(error);
      return {
        ...previous,
        ok: false,
        message: "Coupon could not be cleared. Please try again.",
      };
    }
  }
  const parsed = couponSchema.safeParse(rawCode);
  if (!parsed.success) {
    return {
      ...previous,
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid coupon.",
    };
  }
  try {
    const result = await previewCartCoupon(
      await getCartOwner(),
      parsed.data,
    );
    return {
      ok: true,
      message: `Coupon ${parsed.data} applied to this estimate.`,
      ...result,
    };
  } catch (error) {
    unstable_rethrow(error);
    return {
      ...previous,
      ok: false,
      code: null,
      message:
        error instanceof CommerceError
          ? error.message
          : "Coupon could not be checked. Please try again.",
    };
  }
}
