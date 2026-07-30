import { describe, expect, it } from "vitest";
import {
  aggregatePurchasedCartLines,
  remainingCartQuantity,
} from "./cart-reconciliation";

describe("paid checkout cart reconciliation", () => {
  it("keeps only quantities added after checkout", () => {
    expect(remainingCartQuantity(3, 1)).toBe(2);
  });

  it("removes a line when its current quantity is fully purchased", () => {
    expect(remainingCartQuantity(1, 1)).toBeNull();
    expect(remainingCartQuantity(1, 2)).toBeNull();
  });

  it("aggregates duplicate order lines before consuming the cart", () => {
    expect(
      aggregatePurchasedCartLines([
        { productId: "product-1", variantId: "variant-1", quantity: 1 },
        { productId: "product-1", variantId: "variant-1", quantity: 2 },
        { productId: "product-1", variantId: "variant-2", quantity: 1 },
      ]),
    ).toEqual([
      { productId: "product-1", variantId: "variant-1", quantity: 3 },
      { productId: "product-1", variantId: "variant-2", quantity: 1 },
    ]);
  });
});
