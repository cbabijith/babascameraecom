import { describe, expect, it } from "vitest";
import { resolvePaymentProvider } from "./payment-provider-config";

describe("payment provider configuration", () => {
  it("defaults to Razorpay", () => {
    expect(resolvePaymentProvider(undefined, "production", undefined)).toBe(
      "razorpay",
    );
    expect(resolvePaymentProvider("unknown", "development", undefined)).toBe(
      "razorpay",
    );
  });

  it("allows mock only outside production or with an explicit production opt-in", () => {
    expect(resolvePaymentProvider("mock", "test", undefined)).toBe("mock");
    expect(() =>
      resolvePaymentProvider("mock", "production", undefined),
    ).toThrow("forbidden");
    expect(resolvePaymentProvider("test", "production", "true")).toBe("mock");
  });
});
