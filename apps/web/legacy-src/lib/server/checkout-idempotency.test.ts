import { describe, expect, it } from "vitest";
import { checkoutIdempotencyKey } from "./checkout-idempotency";

describe("checkoutIdempotencyKey", () => {
  it("preserves the caller key across retries", () => {
    const key = "10000000-0000-4000-8000-000000000001";
    expect(checkoutIdempotencyKey(key)).toBe(key);
    expect(checkoutIdempotencyKey(key)).toBe(key);
  });

  it("replaces malformed input exactly once through the supplied generator", () => {
    let calls = 0;
    const generated = checkoutIdempotencyKey("not-a-uuid", () => {
      calls += 1;
      return "20000000-0000-4000-8000-000000000002";
    });
    expect(generated).toBe("20000000-0000-4000-8000-000000000002");
    expect(calls).toBe(1);
  });
});
