import { timingSafeEqual } from "node:crypto";

export function secretsMatch(actual: string, expected: string): boolean {
  if (!actual || !expected) return false;
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

export function isAuthorizedCronRequest(
  request: Request,
  expectedSecret: string | undefined,
): boolean {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);
  return (
    scheme?.toLowerCase() === "bearer" &&
    secretsMatch(token ?? "", expectedSecret?.trim() ?? "")
  );
}
