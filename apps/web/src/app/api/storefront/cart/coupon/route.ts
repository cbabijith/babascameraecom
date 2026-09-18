import { z } from "zod";

import { getCartOwner } from "@/lib/cart-session";
import { CommerceError, previewCartCoupon } from "@/lib/commerce/checkout";
import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
} from "@/lib/api/storefront-api";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  couponCode: z.string().trim().max(40).default(""),
});

const couponSchema = z
  .string()
  .trim()
  .min(1, "Enter a coupon code.")
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/, "Coupon code is invalid.")
  .transform((value) => value.toUpperCase());

function quoteResponse(payload: {
  ok: boolean;
  message: string;
  code: string | null;
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
}) {
  return Response.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsedBody = bodySchema.safeParse(body ?? {});
  if (!parsedBody.success) {
    return quoteResponse({
      ok: false,
      message: "Coupon code is invalid.",
      code: null,
      subtotal: "0.00",
      discount: "0.00",
      shipping: "0.00",
      total: "0.00",
    });
  }
  const rawCode = parsedBody.data.couponCode;

  if (!rawCode) {
    try {
      const result = await previewCartCoupon(await getCartOwner());
      return quoteResponse({ ok: true, message: "Coupon removed.", ...result });
    } catch (error) {
      if (error instanceof CommerceError) {
        return quoteResponse({
          ok: false,
          message: error.message,
          code: null,
          subtotal: "0.00",
          discount: "0.00",
          shipping: "0.00",
          total: "0.00",
        });
      }
      console.error("Coupon clear failed", {
        type: error instanceof Error ? error.name : typeof error,
      });
      return quoteResponse({
        ok: false,
        message: "Coupon could not be cleared. Please try again.",
        code: null,
        subtotal: "0.00",
        discount: "0.00",
        shipping: "0.00",
        total: "0.00",
      });
    }
  }

  const parsed = couponSchema.safeParse(rawCode);
  if (!parsed.success) {
    return quoteResponse({
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid coupon.",
      code: null,
      subtotal: "0.00",
      discount: "0.00",
      shipping: "0.00",
      total: "0.00",
    });
  }

  try {
    const result = await previewCartCoupon(await getCartOwner(), parsed.data);
    return quoteResponse({
      ok: true,
      message: `Coupon ${parsed.data} applied to this estimate.`,
      ...result,
    });
  } catch (error) {
    if (error instanceof CommerceError) {
      return quoteResponse({
        ok: false,
        message: error.message,
        code: null,
        subtotal: "0.00",
        discount: "0.00",
        shipping: "0.00",
        total: "0.00",
      });
    }
    console.error("Coupon check failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return quoteResponse({
      ok: false,
      message: "Coupon could not be checked. Please try again.",
      code: null,
      subtotal: "0.00",
      discount: "0.00",
      shipping: "0.00",
      total: "0.00",
    });
  }
}
