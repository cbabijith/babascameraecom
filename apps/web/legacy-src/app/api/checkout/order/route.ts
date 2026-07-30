import { NextResponse } from "next/server";
import {
  createOrderFromCheckout,
  type CheckoutRequest,
} from "@/lib/server/checkout";
import { apiErrorResponse } from "@/lib/server/route-response";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckoutRequest;
    const result = await createOrderFromCheckout(body);
    return NextResponse.json({ success: true, message: "Order created.", result });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
