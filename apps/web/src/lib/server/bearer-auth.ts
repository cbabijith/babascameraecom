import "server-only";

import { timingSafeEqual } from "node:crypto";

const BEARER_PATTERN = /^Bearer[ \t]+([A-Za-z0-9._~+/-]+=*)$/i;

export function hasValidBearerToken(
  authorizationHeader: string | null,
  expectedSecret: string | undefined,
): boolean {
  const expected = expectedSecret?.trim();
  const match = authorizationHeader?.match(BEARER_PATTERN);
  const actual = match?.[1]?.trim();
  if (!expected || !actual) return false;

  const expectedBytes = Buffer.from(expected, "utf8");
  const actualBytes = Buffer.from(actual, "utf8");
  return (
    expectedBytes.length === actualBytes.length
    && timingSafeEqual(expectedBytes, actualBytes)
  );
}
