import { afterEach, describe, expect, test } from "bun:test";

import { RazorpayRequestError, requestFullRefund } from "@/lib/razorpay";

const originalId = process.env.RAZORPAY_KEY_ID;
const originalSecret = process.env.RAZORPAY_KEY_SECRET;

afterEach(() => {
  process.env.RAZORPAY_KEY_ID = originalId;
  process.env.RAZORPAY_KEY_SECRET = originalSecret;
});

describe("Razorpay refund client", () => {
  test("sends exact paise with the documented refund idempotency header", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    let requestInit: RequestInit | undefined;
    const fetcher = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestInit = init;
      return Response.json({
        id: "rfnd_123",
        payment_id: "pay_123",
        amount: 12_345,
        status: "processed",
      });
    }) as unknown as typeof fetch;
    const result = await requestFullRefund({
      paymentId: "pay_123",
      amountPaise: 12_345,
      idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
      orderId: "123e4567-e89b-12d3-a456-426614174000",
      fetcher,
    });
    expect(result.status).toBe("processed");
    expect((requestInit?.headers as Record<string, string>)["X-Refund-Idempotency"]).toBe(
      "123e4567-e89b-12d3-a456-426614174000",
    );
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({ amount: 12_345 });
  });

  test("rejects an invalid idempotency key before network access", async () => {
    await expect(
      requestFullRefund({
        paymentId: "pay_123",
        amountPaise: 100,
        idempotencyKey: "short!",
        orderId: "order",
      }),
    ).rejects.toBeInstanceOf(RazorpayRequestError);
  });

  test("rejects provider identity or amount mismatches", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    const fetcher = (async () => Response.json({
      id: "rfnd_123", payment_id: "pay_other", amount: 100, status: "processed",
    })) as unknown as typeof fetch;
    await expect(requestFullRefund({
      paymentId: "pay_123",
      amountPaise: 100,
      idempotencyKey: "123e4567-e89b-12d3-a456-426614174000",
      orderId: "123e4567-e89b-12d3-a456-426614174000",
      fetcher,
    })).rejects.toThrow("did not match");
  });
});
