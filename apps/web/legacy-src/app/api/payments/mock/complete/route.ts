import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/user";
import { createServiceClient } from "@/lib/supabase/server";
import {
  applyPaymentEvent,
  configuredPaymentProvider,
} from "@/lib/server/payments";
import { apiErrorResponse } from "@/lib/server/route-response";
import { asNumber, asRow, asString } from "@/lib/server/shapes";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (configuredPaymentProvider() !== "mock") {
      return NextResponse.json(
        { success: false, message: "Mock payments are disabled." },
        { status: 404 },
      );
    }
    const user = await getAuthenticatedUser();
    const body = asRow(await request.json());
    const providerOrderId = asString(body.providerOrderId);
    if (!providerOrderId) {
      return NextResponse.json(
        { success: false, message: "providerOrderId is required." },
        { status: 400 },
      );
    }
    const service = createServiceClient();
    const { data: attempt, error } = await service
      .from("payment_attempts")
      .select("*")
      .eq("provider_order_id", providerOrderId)
      .eq("provider", "razorpay")
      .single();
    if (error || !attempt) {
      return NextResponse.json(
        { success: false, message: "Mock payment attempt not found." },
        { status: 404 },
      );
    }
    const attemptRow = asRow(attempt);
    const { data: ownedOrder } = await service
      .from("orders")
      .select("id")
      .eq("id", asString(attemptRow.order_id))
      .eq("customer_id", user.id)
      .maybeSingle();
    if (!ownedOrder) {
      return NextResponse.json(
        { success: false, message: "Mock payment attempt not found." },
        { status: 404 },
      );
    }
    const eventId = `mock_${createHash("sha256")
      .update(`${user.id}:${providerOrderId}`)
      .digest("hex")
      .slice(0, 24)}`;
    await applyPaymentEvent(service, {
      provider: "razorpay",
      eventId,
      eventType: "payment.captured",
      providerOrderId,
      providerPaymentId: `pay_${eventId.slice(5)}`,
      amountMinor: asNumber(attemptRow.amount_minor),
      signatureVerified: true,
      payload: {
        payment_attempt_id: asString(attemptRow.id),
        order_id: asString(attemptRow.order_id),
        provider_order_id: providerOrderId,
        status: "CAPTURED",
        test_mode: true,
      },
    });
    return NextResponse.json({
      success: true,
      message: "Mock payment completed.",
      result: { eventId, status: "SUCCESS" },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
