import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@babas/database";
import { createServiceClient } from "@/lib/supabase/server";
import { asNumber, asRow, asString } from "./shapes";
import { verifyHmacSignature } from "./payment-signatures";
import {
  validateCapturedProviderPayment,
  type ProviderOrder,
  type ProviderPayment,
} from "./payment-provider-validation";
import { resolvePaymentProvider } from "./payment-provider-config";

export type PaymentProvider = "razorpay" | "mock";

export class ProviderOrderCreationError extends Error {
  constructor(
    message: string,
    readonly safeToReleaseClaim: boolean,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderOrderCreationError";
  }
}

export function configuredPaymentProvider(): PaymentProvider {
  return resolvePaymentProvider(
    process.env.PAYMENT_PROVIDER,
    process.env.NODE_ENV,
    process.env.ALLOW_MOCK_PAYMENTS,
  );
}

function deterministicMockId(prefix: string, seed: string): string {
  return `${prefix}_${createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;
}

async function razorpayResource<T>(path: string): Promise<T> {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay server credentials are not configured.");
  }
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  const body = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !body) {
    throw new Error("Unable to confirm payment with Razorpay.");
  }
  return body;
}

export async function createProviderOrder(input: {
  orderId: string;
  paymentAttemptId: string;
  receipt: string;
  amountMinor: number;
  currency?: string;
  userId: string;
}) {
  const provider = configuredPaymentProvider();
  const amountPaise = Math.max(0, Math.round(input.amountMinor));

  if (provider === "mock") {
    return {
      provider,
      providerOrderId: deterministicMockId("order", input.orderId),
      amountPaise,
      currency: input.currency ?? "INR",
      raw: {
        testMode: true,
        receipt: input.receipt,
      },
    };
  }

  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new ProviderOrderCreationError(
      "Razorpay server credentials are not configured.",
      true,
    );
  }

  const currency = (input.currency ?? "INR").toUpperCase();
  const receipt = input.receipt.slice(0, 40);
  const authorization = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
  const matchingOrder = (value: unknown): Record<string, unknown> | null => {
    const collection = asRow(value);
    const items = Array.isArray(collection.items) ? collection.items : [];
    const matches = items
      .map(asRow)
      .filter((item) => asString(item.receipt) === receipt);
    if (matches.length === 0) return null;
    if (matches.length !== 1) {
      throw new ProviderOrderCreationError(
        "Razorpay returned multiple orders for one checkout receipt.",
        false,
      );
    }
    const match = matches[0];
    const notes = asRow(match.notes);
    if (
      asNumber(match.amount, -1) !== amountPaise ||
      asString(match.currency).toUpperCase() !== currency ||
      asString(notes.order_id) !== input.orderId ||
      asString(notes.payment_attempt_id) !== input.paymentAttemptId ||
      asString(notes.user_id) !== input.userId
    ) {
      throw new ProviderOrderCreationError(
        "The existing Razorpay order does not match this checkout.",
        false,
      );
    }
    return match;
  };
  const reconcileByReceipt = async (): Promise<Record<string, unknown> | null> => {
    let response: Response;
    try {
      const params = new URLSearchParams({ receipt, count: "100" });
      response = await fetch(
        `https://api.razorpay.com/v1/orders?${params.toString()}`,
        {
          headers: { Authorization: authorization },
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        },
      );
    } catch (cause) {
      throw new ProviderOrderCreationError(
        "Unable to reconcile Razorpay order creation.",
        false,
        cause,
      );
    }
    const body = (await response.json().catch(() => null)) as unknown;
    if (!response.ok || !body) {
      throw new ProviderOrderCreationError(
        "Unable to reconcile Razorpay order creation.",
        false,
        body,
      );
    }
    return matchingOrder(body);
  };
  const resultFromRaw = (raw: Record<string, unknown>) => {
    const providerOrderId = asString(raw.id);
    if (
      !providerOrderId ||
      asNumber(raw.amount, -1) !== amountPaise ||
      asString(raw.currency).toUpperCase() !== currency
    ) {
      throw new ProviderOrderCreationError(
        "Razorpay created an order with an invalid response.",
        false,
        raw,
      );
    }
    return {
      provider,
      providerOrderId,
      amountPaise,
      currency,
      raw,
    };
  };

  // Razorpay treats receipt as a unique idempotency identity. Looking it up
  // before POST also repairs an earlier request whose response timed out after
  // Razorpay had already committed the order.
  const reconciled = await reconcileByReceipt();
  if (reconciled) return resultFromRaw(reconciled);

  let response: Response;
  try {
    response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency,
        receipt,
        notes: {
          order_id: input.orderId,
          payment_attempt_id: input.paymentAttemptId,
          user_id: input.userId,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch (cause) {
    const afterAmbiguousFailure = await reconcileByReceipt();
    if (afterAmbiguousFailure) return resultFromRaw(afterAmbiguousFailure);
    throw new ProviderOrderCreationError(
      "Razorpay order creation could not be confirmed.",
      false,
      cause,
    );
  }

  const raw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !raw?.id) {
    const afterRejectedCreate = await reconcileByReceipt();
    if (afterRejectedCreate) return resultFromRaw(afterRejectedCreate);
    throw new ProviderOrderCreationError(
      asString(raw?.description) || "Razorpay order creation failed.",
      !response.ok,
      raw,
    );
  }

  return resultFromRaw(raw);
}

export async function applyPaymentEvent(
  supabase: SupabaseClient<Database>,
  input: {
    provider: "razorpay" | "bank_transfer" | "cod";
    eventId: string;
    eventType: string;
    providerOrderId: string;
    providerPaymentId: string;
    amountMinor: number;
    signatureVerified: boolean;
    payload: Json;
  },
) {
  const { data, error } = await supabase.rpc("apply_payment_event", {
    p_provider: input.provider,
    p_provider_event_id: input.eventId,
    p_event_type: input.eventType,
    p_provider_order_id: input.providerOrderId,
    p_provider_payment_id: input.providerPaymentId,
    p_amount_minor: Math.max(0, Math.round(input.amountMinor)),
    p_signature_verified: input.signatureVerified,
    p_payload: input.payload,
  });
  if (error) {
    throw new Error(`Unable to apply payment event: ${asString(asRow(error).message)}`);
  }
  return data;
}

export async function verifyRazorpayPayment(input: {
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
  userId: string;
}) {
  const provider = configuredPaymentProvider();
  const service = createServiceClient();
  const { data: attempt, error } = await service
    .from("payment_attempts")
    .select("*")
    .eq("provider_order_id", input.providerOrderId)
    .single();
  if (error || !attempt) throw new Error("Payment attempt not found.");
  const attemptRow = asRow(attempt);
  const { data: ownedOrder, error: ownershipError } = await service
    .from("orders")
    .select("id")
    .eq("id", asString(attemptRow.order_id))
    .eq("customer_id", input.userId)
    .maybeSingle();
  if (ownershipError || !ownedOrder) throw new Error("Payment attempt not found.");

  const secret =
    provider === "mock"
      ? process.env.PAYMENT_MOCK_SECRET?.trim()
      : process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) throw new Error("Payment verification secret is not configured.");

  const payload = `${input.providerOrderId}|${input.providerPaymentId}`;
  if (!verifyHmacSignature(secret, payload, input.signature)) {
    throw new Error("Invalid payment signature.");
  }

  if (provider === "razorpay") {
    const [providerPayment, providerOrder] = await Promise.all([
      razorpayResource<ProviderPayment>(
        `payments/${encodeURIComponent(input.providerPaymentId)}`,
      ),
      razorpayResource<ProviderOrder>(
        `orders/${encodeURIComponent(input.providerOrderId)}`,
      ),
    ]);
    validateCapturedProviderPayment(
      {
        paymentId: input.providerPaymentId,
        providerOrderId: input.providerOrderId,
        amountMinor: asNumber(attemptRow.amount_minor),
        currency: asString(attemptRow.currency, "INR"),
        orderId: asString(attemptRow.order_id),
        userId: input.userId,
      },
      providerPayment,
      providerOrder,
    );
  }

  const eventId =
    provider === "mock"
      ? deterministicMockId("event", payload)
      : `client_verify_${input.providerPaymentId}`;
  const applied = await applyPaymentEvent(service, {
    provider: "razorpay",
    eventId,
    eventType: "payment.captured",
    providerOrderId: input.providerOrderId,
    providerPaymentId: input.providerPaymentId,
    amountMinor: asNumber(attemptRow.amount_minor),
    signatureVerified: true,
    payload: {
      payment_attempt_id: asString(attemptRow.id),
      order_id: asString(attemptRow.order_id),
      provider_order_id: input.providerOrderId,
      provider_payment_id: input.providerPaymentId,
      status: "captured",
      test_mode: provider === "mock",
      verified_at: new Date().toISOString(),
    },
  });
  if (applied !== "processed" && applied !== "duplicate") {
    const { data: reconciledOrder } = await service
      .from("orders")
      .select("payment_status")
      .eq("id", asString(attemptRow.order_id))
      .maybeSingle();
    if (reconciledOrder?.payment_status !== "paid") {
      throw new Error("Payment could not be reconciled yet.");
    }
  }
  return {
    orderId: asString(attemptRow.order_id),
    paymentId: input.providerPaymentId,
    status: "SUCCESS",
  };
}

export function verifyRazorpayWebhook(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  return Boolean(secret && verifyHmacSignature(secret, rawBody, signature));
}
