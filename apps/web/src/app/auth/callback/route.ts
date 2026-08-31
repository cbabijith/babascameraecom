import { NextResponse } from "next/server";
import { safeInternalPath } from "@/lib/auth/safe-redirect";

/**
 * OAuth/email callback landing. Auth sessions are handled by better-auth
 * (cookie based), so this simply forwards logged-in users to the account
 * area and everyone else to the login page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeInternalPath(url.searchParams.get("next"), "/account");
  const hasSession = request.headers
    .get("cookie")
    ?.includes("better-auth.session_token");
  if (hasSession) {
    return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, url.origin));
}
