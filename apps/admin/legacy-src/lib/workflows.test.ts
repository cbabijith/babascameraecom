import { describe, expect, it } from "bun:test";

import {
  allowedOrderTransitions,
  allowedReturnTransitions,
  canCancelOrder,
  canTransitionOrder,
  canTransitionReturn,
} from "@/lib/workflows";

describe("admin order workflow", () => {
  it("matches guarded forward fulfilment transitions", () => {
    expect(allowedOrderTransitions("confirmed")).toEqual(["processing"]);
    expect(canTransitionOrder("processing", "packed")).toBe(true);
    expect(canTransitionOrder("packed", "shipped")).toBe(true);
    expect(canTransitionOrder("packed", "cancelled")).toBe(false);
  });

  it("keeps payment and cancellation changes in their dedicated workflows", () => {
    expect(allowedOrderTransitions("pending_payment")).toEqual([]);
    expect(allowedOrderTransitions("payment_review")).toEqual([]);
    expect(canCancelOrder("pending_payment")).toBe(true);
    expect(canCancelOrder("processing")).toBe(true);
    expect(canCancelOrder("packed")).toBe(false);
  });

  it("rejects unknown, backward, and terminal transitions", () => {
    expect(allowedOrderTransitions("unknown")).toEqual([]);
    expect(canTransitionOrder("delivered", "shipped")).toBe(false);
    expect(canTransitionOrder("completed", "processing")).toBe(false);
  });
});

describe("admin return workflow", () => {
  it("allows review and receipt transitions", () => {
    expect(allowedReturnTransitions("requested")).toEqual(["approved", "rejected"]);
    expect(canTransitionReturn("approved", "received")).toBe(true);
  });

  it("does not let the browser mark a provider refund complete", () => {
    expect(canTransitionReturn("received", "refunded")).toBe(false);
    expect(allowedReturnTransitions("received")).toEqual(["closed"]);
  });
});
