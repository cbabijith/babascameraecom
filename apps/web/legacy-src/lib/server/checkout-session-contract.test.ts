import { describe, expect, it } from "vitest";
import { authoritativeCheckoutMethod } from "./checkout-session-contract";

const session = {
  address_id: "address-1",
  payment_method: "bank_transfer",
  idempotency_key: "00000000-0000-4000-8000-000000000001",
  status: "active",
  expires_at: "2030-01-01T00:00:00.000Z",
};

describe("checkout session contract", () => {
  it("returns the authoritative stored method for an exact request replay", () => {
    expect(
      authoritativeCheckoutMethod(
        session,
        {
          addressId: "address-1",
          paymentMethod: "BANK_TRANSFER",
          idempotencyKey: session.idempotency_key,
        },
        new Date("2029-01-01T00:00:00.000Z").getTime(),
      ),
    ).toBe("BANK_TRANSFER");
  });

  it("rejects relabelling an existing quote with a different method", () => {
    expect(() =>
      authoritativeCheckoutMethod(
        session,
        {
          addressId: "address-1",
          paymentMethod: "RAZORPAY",
          idempotencyKey: session.idempotency_key,
        },
        new Date("2029-01-01T00:00:00.000Z").getTime(),
      ),
    ).toThrow("does not match");
  });

  it("rejects address, key, and expiry mismatches", () => {
    expect(() =>
      authoritativeCheckoutMethod(
        session,
        {
          addressId: "address-2",
          paymentMethod: "BANK_TRANSFER",
          idempotencyKey: session.idempotency_key,
        },
      ),
    ).toThrow();
    expect(() =>
      authoritativeCheckoutMethod(
        session,
        {
          addressId: "address-1",
          paymentMethod: "BANK_TRANSFER",
          idempotencyKey: "00000000-0000-4000-8000-000000000002",
        },
      ),
    ).toThrow();
    expect(() =>
      authoritativeCheckoutMethod(
        { ...session, expires_at: "2020-01-01T00:00:00.000Z" },
        {
          addressId: "address-1",
          paymentMethod: "BANK_TRANSFER",
          idempotencyKey: session.idempotency_key,
        },
      ),
    ).toThrow("expired");
  });
});
