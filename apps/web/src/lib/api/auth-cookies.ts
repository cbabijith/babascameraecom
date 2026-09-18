/**
 * Copies every Set-Cookie header produced by a better-auth server-side call
 * onto a JSON route response. Unlike server actions (which re-serialize
 * cookies through next/headers), route handlers can forward the raw
 * attributes exactly as better-auth emitted them.
 */
export function jsonResponseWithCookies(
  body: unknown,
  source: Response | null | undefined,
  status = 200,
): Response {
  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  for (const cookie of source?.headers.getSetCookie?.() ?? []) {
    headers.append("set-cookie", cookie);
  }
  return new Response(JSON.stringify(body), { status, headers });
}
