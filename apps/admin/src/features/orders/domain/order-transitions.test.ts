import { describe, expect, test } from "bun:test";

import { canTransitionOrder } from "./order-transitions";

describe("order transition policy", () => {
  test("allows the fulfilment happy path", () => {
    expect(canTransitionOrder("pending", "confirmed")).toBeTrue();
    expect(canTransitionOrder("confirmed", "processing")).toBeTrue();
    expect(canTransitionOrder("processing", "shipped")).toBeTrue();
    expect(canTransitionOrder("shipped", "delivered")).toBeTrue();
  });

  test("blocks skips, reversals, and final-state changes", () => {
    expect(canTransitionOrder("pending", "shipped")).toBeFalse();
    expect(canTransitionOrder("delivered", "processing")).toBeFalse();
    expect(canTransitionOrder("cancelled", "confirmed")).toBeFalse();
    expect(canTransitionOrder("refunded", "pending")).toBeFalse();
  });
});
