import { describe, expect, it } from "vitest";
import { hmacHex, verifyHmacSignature } from "./payment-signatures";

describe("payment signatures", () => {
  it("accepts the expected HMAC and rejects modified payloads", () => {
    const secret = "test-only-secret";
    const payload = "order_123|pay_456";
    const signature = hmacHex(secret, payload);

    expect(verifyHmacSignature(secret, payload, signature)).toBe(true);
    expect(verifyHmacSignature(secret, `${payload}x`, signature)).toBe(false);
  });

  it("rejects empty or malformed signatures", () => {
    expect(verifyHmacSignature("secret", "payload", "")).toBe(false);
    expect(verifyHmacSignature("", "payload", "abc")).toBe(false);
    expect(verifyHmacSignature("secret", "payload", "abc")).toBe(false);
  });
});
