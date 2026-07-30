import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { Json } from "@babas/database";
import { createServiceClient } from "@/lib/supabase/server";
import {
  applyPaymentEvent,
  verifyRazorpayWebhook,
} from "@/lib/server/payments";
import { reconcileRazorpayRefundEvent } from "@/lib/server/refunds";
import { asNumber, asRow, asString } from "@/lib/server/shapes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyRazorpayWebhook(rawBody, signature)) {
    return NextResponse.json(
      { success: false, message: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid webhook JSON." },
      { status: 400 },
    );
  }

  const row = asRow(payload);
  const eventType = asString(row.event);
  const eventId =
    request.headers.get("x-razorpay-event-id")?.trim() ||
    asString(row.id) ||
    `webhook_${createHash("sha256").update(rawBody).digest("hex")}`;

  if (eventType.startsWith("refund.")) {
    if (eventType !== "refund.processed" && eventType !== "refund.failed") {
      return NextResponse.json({
        success: true,
        ignored: true,
        eventType,
      });
    }
    const refundEntity = asRow(asRow(asRow(row.payload).refund).entity);
    const providerRefundId = asString(refundEntity.id);
    const amountMinor = asNumber(refundEntity.amount);
    if (!providerRefundId || amountMinor <= 0) {
      return NextResponse.json(
        { success: false, message: "Webhook refund details are incomplete." },
        { status: 400 },
      );
    }
    try {
      const outcome = await reconcileRazorpayRefundEvent({
        eventId,
        providerRefundId,
        eventType,
        amountMinor,
        payload: payload as Json,
      });
      if (outcome === "retryable") {
        return NextResponse.json(
          { success: false, message: "Refund event is pending reconciliation." },
          { status: 503, headers: { "Retry-After": "30" } },
        );
      }
      return NextResponse.json({ success: true, outcome });
    } catch {
      return NextResponse.json(
        { success: false, message: "Refund webhook processing failed." },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
  }

  const paymentEntity = asRow(asRow(asRow(row.payload).payment).entity);
  const orderEntity = asRow(asRow(asRow(row.payload).order).entity);
  const providerOrderId =
    asString(paymentEntity.order_id) || asString(orderEntity.id);
  const providerPaymentId = asString(paymentEntity.id) || undefined;
  const amountMinor =
    asNumber(paymentEntity.amount) || asNumber(orderEntity.amount_paid);
  if (!eventType || !providerOrderId || !providerPaymentId || amountMinor <= 0) {
    return NextResponse.json(
      { success: false, message: "Webhook payment details are incomplete." },
      { status: 400 },
    );
  }

  try {
    const service = createServiceClient();
    const applied = await applyPaymentEvent(service, {
      provider: "razorpay",
      eventId,
      eventType,
      providerOrderId,
      providerPaymentId,
      amountMinor,
      signatureVerified: true,
      payload: payload as Json,
    });
    if (applied !== "retryable") {
      return NextResponse.json({ success: true, outcome: applied });
    }
    return NextResponse.json(
      { success: false, message: "Payment event is pending reconciliation." },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Webhook processing failed." },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }
}
