import { describe, expect, it } from "vitest";
import { validateCapturedProviderPayment } from "./payment-provider-validation";

const expected = {
  paymentId: "pay_123",
  providerOrderId: "order_123",
  amountMinor: 125_000,
  currency: "INR",
  orderId: "00000000-0000-4000-8000-000000000001",
  userId: "00000000-0000-4000-8000-000000000002",
};

const payment = {
  id: "pay_123",
  order_id: "order_123",
  amount: 125_000,
  currency: "INR",
  status: "captured",
  captured: true,
};

const order = {
  id: "order_123",
  amount: 125_000,
  amount_paid: 125_000,
  currency: "INR",
  status: "paid",
  notes: {
    order_id: expected.orderId,
    user_id: expected.userId,
  },
};

describe("validateCapturedProviderPayment", () => {
  it("accepts a captured payment matching amount, currency, order, and owner", () => {
    expect(() =>
      validateCapturedProviderPayment(expected, payment, order),
    ).not.toThrow();
  });

  it("rejects amount and currency mismatches", () => {
    expect(() =>
      validateCapturedProviderPayment(
        expected,
        { ...payment, amount: payment.amount - 1 },
        order,
      ),
    ).toThrow(/amount/i);
    expect(() =>
      validateCapturedProviderPayment(
        expected,
        { ...payment, currency: "USD" },
        order,
      ),
    ).toThrow(/currency/i);
  });

  it("requires exact provider order ownership notes", () => {
    expect(() =>
      validateCapturedProviderPayment(expected, payment, {
        ...order,
        notes: undefined,
      }),
    ).toThrow(/ownership/i);
    expect(() =>
      validateCapturedProviderPayment(expected, payment, {
        ...order,
        notes: { ...order.notes, user_id: "another-user" },
      }),
    ).toThrow(/customer/i);
  });
});
