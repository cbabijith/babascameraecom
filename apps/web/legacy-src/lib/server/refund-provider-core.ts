import { createHash } from "node:crypto";

export type RefundProviderInput = {
  refundId: string;
  orderId: string;
  paymentId: string;
  idempotencyKey: string;
  amountMinor: number;
  currency: string;
};

export type RefundProviderEntity = {
  id: string;
  payment_id: string;
  amount: number;
  currency?: string;
  status: string;
  notes?: Record<string, unknown>;
};

export function deterministicMockRefundId(refundId: string): string {
  return `rfnd_mock_${createHash("sha256")
    .update(refundId)
    .digest("hex")
    .slice(0, 24)}`;
}

export function refundRequestBody(input: RefundProviderInput) {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("Refund amount must be a positive minor-unit integer.");
  }
  return {
    amount: input.amountMinor,
    speed: "normal",
    receipt: input.idempotencyKey,
    notes: {
      refund_id: input.refundId,
      order_id: input.orderId,
      idempotency_key: input.idempotencyKey,
    },
  };
}

export function validateRefundProviderEntity(
  expected: RefundProviderInput,
  entity: RefundProviderEntity,
): void {
  if (!entity.id) throw new Error("Refund provider returned no refund id.");
  if (entity.payment_id !== expected.paymentId) {
    throw new Error("Refund provider payment id does not match.");
  }
  if (entity.amount !== expected.amountMinor) {
    throw new Error("Refund provider amount does not match.");
  }
  if (
    entity.currency &&
    entity.currency.toUpperCase() !== expected.currency.toUpperCase()
  ) {
    throw new Error("Refund provider currency does not match.");
  }
  if (!["pending", "processed", "failed"].includes(entity.status)) {
    throw new Error("Refund provider returned an unsupported status.");
  }
  if (
    entity.notes?.refund_id !== expected.refundId ||
    entity.notes?.order_id !== expected.orderId ||
    entity.notes?.idempotency_key !== expected.idempotencyKey
  ) {
    throw new Error("Refund provider ownership does not match.");
  }
}

export function mockRefundProviderEntity(
  input: RefundProviderInput,
): RefundProviderEntity {
  return {
    id: deterministicMockRefundId(input.refundId),
    payment_id: input.paymentId,
    amount: input.amountMinor,
    currency: input.currency,
    status: "processed",
    notes: refundRequestBody(input).notes,
  };
}

export function terminalRefundEventType(
  status: RefundProviderEntity["status"],
): "refund.processed" | "refund.failed" | null {
  if (status === "processed") return "refund.processed";
  if (status === "failed") return "refund.failed";
  return null;
}
