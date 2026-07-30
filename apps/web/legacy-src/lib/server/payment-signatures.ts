import { createHmac, timingSafeEqual } from "node:crypto";

export function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyHmacSignature(
  secret: string,
  payload: string,
  signature: string,
): boolean {
  if (!secret || !signature) return false;
  const expected = Buffer.from(hmacHex(secret, payload), "utf8");
  const actual = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
