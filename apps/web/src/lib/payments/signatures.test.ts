import { describe, expect, it } from "vitest";
import { verifyPaymentHmac, verifyWebhookHmac } from "./signatures";

describe("Razorpay HMAC verification", () => {
  it("accepts the exact order_id|payment_id vector", () => {
    expect(
      verifyPaymentHmac({
        providerOrderId: "order_abc",
        providerPaymentId: "pay_xyz",
        secret: "secret_123",
        signature:
          "59e29fd9db1df565408efc3b223a7bd1c1a6129a8f153b7407a9c0f56a0a1c23",
      }),
    ).toBe(true);
  });

  it("rejects changed ids and malformed signatures", () => {
    const input = {
      providerOrderId: "order_abc",
      providerPaymentId: "pay_xyz",
      secret: "secret_123",
      signature:
        "59e29fd9db1df565408efc3b223a7bd1c1a6129a8f153b7407a9c0f56a0a1c23",
    };
    expect(
      verifyPaymentHmac({ ...input, providerPaymentId: "pay_changed" }),
    ).toBe(false);
    expect(verifyPaymentHmac({ ...input, signature: "bad" })).toBe(false);
  });

  it("verifies the raw webhook body byte-for-byte", () => {
    const rawBody =
      '{"event":"payment.captured","payload":{"id":"pay_1"}}';
    expect(
      verifyWebhookHmac({
        rawBody,
        secret: "webhook_secret",
        signature:
          "8f6d065f9acb436d0686a77928715404f3b4822a89735d58db335bc2ba4ba8d0",
      }),
    ).toBe(true);
    expect(
      verifyWebhookHmac({
        rawBody: `${rawBody}\n`,
        secret: "webhook_secret",
        signature:
          "8f6d065f9acb436d0686a77928715404f3b4822a89735d58db335bc2ba4ba8d0",
      }),
    ).toBe(false);
  });
});
