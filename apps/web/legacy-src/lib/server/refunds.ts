import "server-only";

import { randomUUID } from "node:crypto";
import type {
  Database,
  Json,
} from "@babas/database";
import { createServiceClient } from "@/lib/supabase/server";
import { asNumber, asRow, asString } from "./shapes";
import { configuredPaymentProvider } from "./payments";
import {
  mockRefundProviderEntity,
  refundRequestBody,
  terminalRefundEventType,
  validateRefundProviderEntity,
  type RefundProviderEntity,
  type RefundProviderInput,
} from "./refund-provider-core";

type RefundRow = Database["public"]["Tables"]["refunds"]["Row"];
type PaymentEventOutcome =
  Database["public"]["Enums"]["payment_event_outcome"];

class RefundProviderRequestError extends Error {
  constructor(
    message: string,
    readonly definitive: boolean,
  ) {
    super(message);
    this.name = "RefundProviderRequestError";
  }
}

function razorpayCredentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new RefundProviderRequestError(
      "Razorpay server credentials are not configured.",
      true,
    );
  }
  return { keyId, keySecret };
}

function providerErrorMessage(body: unknown): string {
  const row = asRow(body);
  const nested = asRow(row.error);
  return (
    asString(nested.description) ||
    asString(nested.reason) ||
    asString(row.description) ||
    "Razorpay refund creation failed."
  );
}

function refundProviderEntity(body: unknown): RefundProviderEntity {
  const row = asRow(body);
  return {
    id: asString(row.id),
    payment_id: asString(row.payment_id),
    amount: asNumber(row.amount),
    currency: asString(row.currency),
    status: asString(row.status),
    notes: asRow(row.notes),
  };
}

async function createRazorpayRefund(
  input: RefundProviderInput,
): Promise<RefundProviderEntity> {
  const { keyId, keySecret } = razorpayCredentials();
  let response: Response;
  try {
    response = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(input.paymentId)}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
          "Content-Type": "application/json",
          "X-Refund-Idempotency": input.idempotencyKey,
        },
        body: JSON.stringify(refundRequestBody(input)),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      },
    );
  } catch {
    // The request may have reached Razorpay. Keep the claim and safely replay
    // the same X-Refund-Idempotency key on the next processor run.
    throw new RefundProviderRequestError(
      "Razorpay refund request has an unknown outcome and will be retried safely.",
      false,
    );
  }

  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    const definitive =
      response.status >= 400 &&
      response.status < 500 &&
      ![408, 409, 425, 429].includes(response.status);
    throw new RefundProviderRequestError(
      providerErrorMessage(body),
      definitive,
    );
  }

  const entity = refundProviderEntity(body);
  validateRefundProviderEntity(input, entity);
  return entity;
}

async function fetchRazorpayRefund(
  providerRefundId: string,
  expected: RefundProviderInput,
): Promise<RefundProviderEntity> {
  const { keyId, keySecret } = razorpayCredentials();
  let response: Response;
  try {
    response = await fetch(
      `https://api.razorpay.com/v1/refunds/${encodeURIComponent(providerRefundId)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );
  } catch {
    throw new RefundProviderRequestError(
      "Unable to reconcile the refund with Razorpay yet.",
      false,
    );
  }
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new RefundProviderRequestError(providerErrorMessage(body), false);
  }
  const entity = refundProviderEntity(body);
  if (entity.id !== providerRefundId) {
    throw new Error("Refund provider id does not match.");
  }
  validateRefundProviderEntity(expected, entity);
  return entity;
}

async function applyRefundEvent(input: {
  eventId: string;
  providerRefundId: string;
  eventType: string;
  amountMinor: number;
  payload: Json;
}): Promise<PaymentEventOutcome> {
  const service = createServiceClient();
  const { data, error } = await service.rpc("apply_refund_event", {
    p_provider: "razorpay",
    p_provider_event_id: input.eventId,
    p_provider_refund_id: input.providerRefundId,
    p_event_type: input.eventType,
    p_amount_minor: input.amountMinor,
    p_signature_verified: true,
    p_payload: input.payload,
  });
  if (error) {
    throw new Error(
      `Unable to apply refund event: ${asString(asRow(error).message)}`,
    );
  }
  return data;
}

export async function reconcileRazorpayRefundEvent(input: {
  eventId: string;
  providerRefundId: string;
  eventType: "refund.processed" | "refund.failed";
  amountMinor: number;
  payload: Json;
}): Promise<PaymentEventOutcome> {
  return applyRefundEvent(input);
}

async function failClaim(
  refundId: string,
  processingToken: string,
  reason: string,
): Promise<void> {
  const service = createServiceClient();
  const { error } = await service.rpc("fail_refund_processing", {
    p_refund_id: refundId,
    p_processing_token: processingToken,
    p_reason: reason.slice(0, 500),
  });
  if (error) {
    throw new Error(
      `Unable to fail refund claim: ${asString(asRow(error).message)}`,
    );
  }
}

async function processClaimedRefund(
  refund: RefundRow,
  processingToken: string,
): Promise<"awaiting_webhook" | "mock_processed" | "reconciled"> {
  const service = createServiceClient();
  const { data: attempt, error: attemptError } = await service
    .from("payment_attempts")
    .select("id,provider,provider_payment_id,currency,status")
    .eq("id", refund.payment_attempt_id)
    .maybeSingle();
  const providerPaymentId = asString(attempt?.provider_payment_id);
  if (
    attemptError ||
    !attempt ||
    attempt.provider !== "razorpay" ||
    !providerPaymentId ||
    !["captured", "partially_refunded"].includes(attempt.status)
  ) {
    await failClaim(
      refund.id,
      processingToken,
      "Captured Razorpay payment details were not found.",
    );
    throw new Error("Captured Razorpay payment details were not found.");
  }

  const providerInput: RefundProviderInput = {
    refundId: refund.id,
    orderId: refund.order_id,
    paymentId: providerPaymentId,
    idempotencyKey: refund.idempotency_key,
    amountMinor: refund.amount_minor,
    currency: asString(attempt.currency, "INR"),
  };
  const provider = configuredPaymentProvider();

  if (refund.provider_refund_id) {
    const providerRefund =
      provider === "mock"
        ? mockRefundProviderEntity(providerInput)
        : await fetchRazorpayRefund(refund.provider_refund_id, providerInput);
    if (providerRefund.id !== refund.provider_refund_id) {
      throw new Error("Stored provider refund id does not match.");
    }
    const eventType = terminalRefundEventType(providerRefund.status);
    if (!eventType) return "awaiting_webhook";
    const outcome = await applyRefundEvent({
      eventId: `provider_reconcile_${providerRefund.id}_${providerRefund.status}`,
      providerRefundId: providerRefund.id,
      eventType,
      amountMinor: refund.amount_minor,
      payload: {
        reconciled_via: provider === "mock" ? "mock" : "razorpay_api",
        refund: providerRefund as unknown as Json,
      },
    });
    if (outcome === "retryable" || outcome === "rejected") {
      throw new Error(`Refund reconciliation returned ${outcome}.`);
    }
    return provider === "mock" ? "mock_processed" : "reconciled";
  }

  let providerRefund: RefundProviderEntity;
  try {
    providerRefund =
      provider === "mock"
        ? mockRefundProviderEntity(providerInput)
        : await createRazorpayRefund(providerInput);
  } catch (error) {
    if (error instanceof RefundProviderRequestError && error.definitive) {
      await failClaim(refund.id, processingToken, error.message);
    }
    throw error;
  }

  const { error: attachError } = await service.rpc("attach_provider_refund", {
    p_refund_id: refund.id,
    p_processing_token: processingToken,
    p_provider_refund_id: providerRefund.id,
  });
  if (attachError) {
    // The provider operation is idempotent and may already exist. Preserve the
    // processing state so the same key can be reconciled without double-refund.
    throw new Error(
      `Unable to attach provider refund: ${asString(asRow(attachError).message)}`,
    );
  }

  if (provider === "mock") {
    const outcome = await applyRefundEvent({
      eventId: `mock_refund_processed_${providerRefund.id}`,
      providerRefundId: providerRefund.id,
      eventType: "refund.processed",
      amountMinor: refund.amount_minor,
      payload: {
        test_mode: true,
        refund: providerRefund as unknown as Json,
      },
    });
    if (outcome === "retryable" || outcome === "rejected") {
      throw new Error(`Mock refund reconciliation returned ${outcome}.`);
    }
    return "mock_processed";
  }

  // The signed refund.processed/refund.failed webhook is the terminal source
  // of truth even if the synchronous API response already says "processed".
  return "awaiting_webhook";
}

export type RefundBatchResult = {
  scanned: number;
  awaitingWebhook: number;
  mockProcessed: number;
  reconciled: number;
  skipped: number;
  failures: Array<{ refundId: string; message: string }>;
};

export async function processRefundBatch(limit = 10): Promise<RefundBatchResult> {
  const service = createServiceClient();
  const batchSize = Math.min(25, Math.max(1, Math.floor(limit)));
  const { data, error } = await service
    .from("refunds")
    .select(
      "id,order_id,payment_attempt_id,amount_minor,status,reason,provider_refund_id,idempotency_key,processing_token,processing_started_at,processing_error,requested_by,processed_at,created_at,updated_at",
    )
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: true })
    .limit(batchSize);
  if (error) throw new Error("Unable to load pending refunds.");

  const result: RefundBatchResult = {
    scanned: data?.length ?? 0,
    awaitingWebhook: 0,
    mockProcessed: 0,
    reconciled: 0,
    skipped: 0,
    failures: [],
  };

  for (const candidate of data ?? []) {
    const processingToken =
      candidate.status === "processing"
        ? candidate.processing_token
        : randomUUID();
    if (!processingToken) {
      result.skipped += 1;
      result.failures.push({
        refundId: candidate.id,
        message: "Processing refund has no claim token.",
      });
      continue;
    }

    const { data: claimed, error: claimError } = await service.rpc(
      "claim_refund_for_processing",
      {
        p_refund_id: candidate.id,
        p_processing_token: processingToken,
      },
    );
    if (claimError || !claimed) {
      result.skipped += 1;
      continue;
    }

    try {
      const state = await processClaimedRefund(claimed, processingToken);
      if (state === "mock_processed") result.mockProcessed += 1;
      else if (state === "reconciled") result.reconciled += 1;
      else result.awaitingWebhook += 1;
    } catch (processError) {
      result.failures.push({
        refundId: candidate.id,
        message:
          processError instanceof Error
            ? processError.message
            : "Refund processing failed.",
      });
    }
  }
  return result;
}
