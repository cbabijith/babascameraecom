import { describe, expect, it } from "vitest";
import { checkoutReplayDisposition } from "./checkout-replay-contract";

const expected = {
  checkoutSessionId: "00000000-0000-4000-8000-000000000001",
  customerId: "00000000-0000-4000-8000-000000000002",
  paymentMethod: "razorpay" as const,
  totalMinor: 125_000,
  currency: "INR",
};

const order = {
  id: "00000000-0000-4000-8000-000000000003",
  checkout_session_id: expected.checkoutSessionId,
  customer_id: expected.customerId,
  status: "pending_payment",
  payment_status: "pending",
  payment_method: "razorpay",
  total_minor: expected.totalMinor,
  currency: expected.currency,
};

const attempt = {
  id: "00000000-0000-4000-8000-000000000004",
  order_id: order.id,
  method: "razorpay",
  status: "pending",
  amount_minor: expected.totalMinor,
  currency: expected.currency,
};

const futureExpiry = "2030-01-01T00:15:00.000Z";
const now = new Date("2030-01-01T00:00:00.000Z").getTime();

describe("consumed checkout replay contract", () => {
  it("allows an exact payable online-order replay", () => {
    expect(
      checkoutReplayDisposition({
        expected,
        order,
        attempt,
        activeReservationExpiries: [futureExpiry],
        now,
      }),
    ).toBe("payable");
  });

  it("rejects a replay after the order was cancelled", () => {
    expect(() =>
      checkoutReplayDisposition({
        expected,
        order: {
          ...order,
          status: "cancelled",
          payment_status: "cancelled",
        },
        attempt: { ...attempt, status: "cancelled" },
        activeReservationExpiries: [],
        now,
      }),
    ).toThrow("new checkout quote");
  });

  it("rejects a replay after reservation expiry even before cleanup runs", () => {
    expect(() =>
      checkoutReplayDisposition({
        expected,
        order,
        attempt,
        activeReservationExpiries: ["2029-12-31T23:59:59.000Z"],
        now,
      }),
    ).toThrow("new checkout quote");
  });

  it("rejects the terminal state written by reservation-expiry cleanup", () => {
    expect(() =>
      checkoutReplayDisposition({
        expected,
        order: { ...order, status: "failed", payment_status: "failed" },
        attempt: { ...attempt, status: "failed" },
        activeReservationExpiries: [],
        now,
      }),
    ).toThrow("new checkout quote");
  });

  it("treats a consistently captured payment as completed, never payable again", () => {
    expect(
      checkoutReplayDisposition({
        expected,
        order: {
          ...order,
          status: "confirmed",
          payment_status: "paid",
        },
        attempt: { ...attempt, status: "captured" },
        activeReservationExpiries: [],
        now,
      }),
    ).toBe("completed");
  });

  it("rejects quote, order, and attempt ownership or amount mismatches", () => {
    expect(() =>
      checkoutReplayDisposition({
        expected,
        order,
        attempt: { ...attempt, amount_minor: expected.totalMinor + 1 },
        activeReservationExpiries: [futureExpiry],
        now,
      }),
    ).toThrow("does not match");
  });
});
