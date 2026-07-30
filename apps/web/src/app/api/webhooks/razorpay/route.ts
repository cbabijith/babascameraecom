import { NextResponse } from "next/server";
import {
  and,
  eq,
  getDatabase,
  inArray,
  paymentEvents,
  refunds,
  type JsonObject,
} from "@babascamera/db";
import {
  reconcileCapturedPayment,
  recordPaymentEvent,
  cancelFailedRazorpayOrder,
} from "@/lib/commerce/checkout";
import { completeRefund } from "@/lib/jobs/refunds";
import { verifyRazorpayWebhook } from "@/lib/payments/razorpay";

export const runtime = "nodejs";

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function entityAt(payload: UnknownRecord, key: string): UnknownRecord | null {
  const payloadRecord = record(payload.payload);
  const container = payloadRecord ? record(payloadRecord[key]) : null;
  return container ? record(container.entity) : null;
}

function stringField(source: UnknownRecord | null, key: string) {
  const value = source?.[key];
  return typeof value === "string" && value ? value : null;
}

async function finishEvent(
  eventId: string,
  outcome: "processed" | "ignored" | "failed",
  orderId?: string | null,
  error?: string | null,
) {
  await getDatabase()
    .update(paymentEvents)
    .set({
      outcome,
      processedAt: new Date(),
      orderId: orderId ?? null,
      error: error?.slice(0, 500) ?? null,
      updatedAt: new Date(),
    })
    .where(eq(paymentEvents.providerEventId, eventId));
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyRazorpayWebhook(rawBody, signature)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const eventId = request.headers.get("x-razorpay-event-id")?.trim();
  if (!eventId || eventId.length > 200) {
    return NextResponse.json(
      { ok: false, message: "Webhook event ID is required." },
      { status: 400 },
    );
  }
  let payload: UnknownRecord;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    const parsedRecord = record(parsed);
    if (!parsedRecord) throw new Error("Invalid JSON object");
    payload = parsedRecord;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const type =
    typeof payload.event === "string" ? payload.event : "unknown";
  const inserted = await recordPaymentEvent({
    providerEventId: eventId,
    type,
    payload: payload as JsonObject,
    outcome: "pending",
  });
  if (!inserted.length) {
    const [existing] = await getDatabase()
      .select({ outcome: paymentEvents.outcome })
      .from(paymentEvents)
      .where(eq(paymentEvents.providerEventId, eventId))
      .limit(1);
    if (existing?.outcome === "processed" || existing?.outcome === "ignored") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  try {
    if (type === "payment.captured") {
      const payment = entityAt(payload, "payment");
      const providerPaymentId = stringField(payment, "id");
      const providerOrderId = stringField(payment, "order_id");
      if (!providerPaymentId || !providerOrderId) {
        throw new Error("Captured payment identifiers are missing.");
      }
      const result = await reconcileCapturedPayment({
        providerOrderId,
        providerPaymentId,
      });
      await finishEvent(eventId, "processed", result.order.id);
      return NextResponse.json({
        ok: true,
        compensated: result.compensated,
      });
    }

    if (type === "payment.failed") {
      const payment = entityAt(payload, "payment");
      const providerOrderId = stringField(payment, "order_id");
      const orderId = providerOrderId
        ? await cancelFailedRazorpayOrder(providerOrderId)
        : null;
      await finishEvent(eventId, "processed", orderId);
      return NextResponse.json({ ok: true });
    }

    if (type === "refund.created") {
      const refundEntity = entityAt(payload, "refund");
      const providerRefundId = stringField(refundEntity, "id");
      const providerPaymentId = stringField(refundEntity, "payment_id");
      const providerStatus = stringField(refundEntity, "status");
      if (!providerRefundId || !providerPaymentId) {
        throw new Error("Refund identifiers are missing.");
      }
      const [localRefund] = await getDatabase()
        .select()
        .from(refunds)
        .where(eq(refunds.providerRefundId, providerRefundId))
        .limit(1);
      const [pendingRefund] = localRefund
        ? []
        : await getDatabase()
            .select()
            .from(refunds)
            .where(
              and(
                eq(refunds.providerPaymentId, providerPaymentId),
                inArray(refunds.status, ["pending", "processing"]),
              ),
            )
            .orderBy(refunds.createdAt)
            .limit(1);
      const matched = localRefund ?? pendingRefund;
      if (!matched) {
        await finishEvent(eventId, "ignored");
        return NextResponse.json({ ok: true, ignored: true });
      }
      await completeRefund(
        matched.id,
        providerRefundId,
        providerStatus === "processed"
          ? "processed"
          : providerStatus === "failed"
            ? "failed"
            : "pending",
      );
      await finishEvent(eventId, "processed", matched.orderId);
      return NextResponse.json({ ok: true });
    }

    await finishEvent(eventId, "ignored");
    return NextResponse.json({ ok: true, ignored: true });
  } catch (error) {
    await finishEvent(
      eventId,
      "failed",
      null,
      error instanceof Error ? error.name : "Webhook processing failed",
    );
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
