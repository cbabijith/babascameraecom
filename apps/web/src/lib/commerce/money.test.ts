import { describe, expect, it } from "vitest";
import {
  calculateCheckoutTotals,
  decimalToPaise,
  paiseToDecimal,
  percentageToBasisPoints,
} from "./money";

describe("integer checkout money", () => {
  it("adds 0.1 and 0.2 without floating-point drift", () => {
    const totals = calculateCheckoutTotals({
      lines: [
        { unitPricePaise: decimalToPaise("0.10"), quantity: 1 },
        { unitPricePaise: decimalToPaise("0.20"), quantity: 1 },
      ],
      shippingFeePaise: 0n,
    });
    expect(totals.totalPaise).toBe(30n);
    expect(paiseToDecimal(totals.totalPaise)).toBe("0.30");
  });

  it("caps a percentage coupon in paise", () => {
    const totals = calculateCheckoutTotals({
      lines: [{ unitPricePaise: decimalToPaise("100.00"), quantity: 1 }],
      coupon: {
        type: "percentage",
        basisPoints: percentageToBasisPoints("15"),
        maximumDiscountPaise: decimalToPaise("10.00"),
      },
      shippingFeePaise: 0n,
    });
    expect(totals.discountPaise).toBe(1_000n);
    expect(totals.totalPaise).toBe(9_000n);
  });

  it("applies free shipping only at or above the discounted threshold", () => {
    const below = calculateCheckoutTotals({
      lines: [{ unitPricePaise: decimalToPaise("999.99"), quantity: 1 }],
      shippingFeePaise: decimalToPaise("50"),
      freeShippingThresholdPaise: decimalToPaise("1000"),
    });
    const exact = calculateCheckoutTotals({
      lines: [{ unitPricePaise: decimalToPaise("1000"), quantity: 1 }],
      shippingFeePaise: decimalToPaise("50"),
      freeShippingThresholdPaise: decimalToPaise("1000"),
    });
    expect(below.shippingPaise).toBe(5_000n);
    expect(exact.shippingPaise).toBe(0n);
  });

  it("rejects values with more than two decimal places", () => {
    expect(() => decimalToPaise("10.001")).toThrow();
  });
});
