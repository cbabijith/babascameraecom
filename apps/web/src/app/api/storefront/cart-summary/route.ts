import { NextResponse } from "next/server";

import { getCartSummary } from "@/features/cart/services/get-cart-summary";

export async function GET() {
  try {
    return NextResponse.json(
      { success: true, data: await getCartSummary() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Storefront cart summary failed", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CART_SUMMARY_UNAVAILABLE",
          message: "The cart summary is temporarily unavailable.",
        },
      },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
