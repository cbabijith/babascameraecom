import { randomUUID } from "node:crypto";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function checkoutIdempotencyKey(
  value: string | null | undefined,
  generate: () => string = randomUUID,
): string {
  const candidate = value?.trim();
  return candidate && UUID_PATTERN.test(candidate)
    ? candidate.toLowerCase()
    : generate();
}
