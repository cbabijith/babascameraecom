import { describe, expect, it } from "vitest";
import {
  deterministicMockRefundId,
  mockRefundProviderEntity,
  refundRequestBody,
  terminalRefundEventType,
  validateRefundProviderEntity,
  type RefundProviderInput,
} from "./refund-provider-core";

const input: RefundProviderInput = {
  refundId: "00000000-0000-4000-8000-000000000001",
  orderId: "00000000-0000-4000-8000-000000000002",
  paymentId: "pay_123",
  idempotencyKey: "00000000-0000-4000-8000-000000000003",
  amountMinor: 12550,
  currency: "INR",
};

describe("refund provider contract", () => {
  it("builds an exact minor-unit request with ownership notes", () => {
    expect(refundRequestBody(input)).toEqual({
      amount: 12550,
      speed: "normal",
      receipt: input.idempotencyKey,
      notes: {
        refund_id: input.refundId,
        order_id: input.orderId,
        idempotency_key: input.idempotencyKey,
      },
    });
  });

  it("generates stable mock ids and valid mock entities", () => {
    expect(deterministicMockRefundId(input.refundId)).toBe(
      deterministicMockRefundId(input.refundId),
    );
    expect(deterministicMockRefundId(input.refundId)).toMatch(
      /^rfnd_mock_[a-f0-9]{24}$/,
    );
    expect(() =>
      validateRefundProviderEntity(input, mockRefundProviderEntity(input)),
    ).not.toThrow();
  });

  it("rejects amount and payment mismatches", () => {
    expect(() =>
      validateRefundProviderEntity(input, {
        ...mockRefundProviderEntity(input),
        amount: input.amountMinor + 1,
      }),
    ).toThrow("amount");
    expect(() =>
      validateRefundProviderEntity(input, {
        ...mockRefundProviderEntity(input),
        payment_id: "pay_other",
      }),
    ).toThrow("payment id");
  });

  it("requires the ownership notes to round-trip", () => {
    expect(() =>
      validateRefundProviderEntity(input, {
        ...mockRefundProviderEntity(input),
        notes: {},
      }),
    ).toThrow("ownership");
  });

  it("reconciles only terminal provider states", () => {
    expect(terminalRefundEventType("pending")).toBeNull();
    expect(terminalRefundEventType("processed")).toBe("refund.processed");
    expect(terminalRefundEventType("failed")).toBe("refund.failed");
  });
});
