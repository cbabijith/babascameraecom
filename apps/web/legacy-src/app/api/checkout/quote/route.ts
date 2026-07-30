import { NextResponse } from "next/server";
import { quoteCheckout, type CheckoutRequest } from "@/lib/server/checkout";
import { apiErrorResponse } from "@/lib/server/route-response";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutRequest;
    const quote = await quoteCheckout(body);
    return NextResponse.json({ success: true, message: "Checkout quoted.", result: quote });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
