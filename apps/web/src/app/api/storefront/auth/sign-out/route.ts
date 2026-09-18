import { cookies } from "next/headers";

import { jsonResponseWithCookies } from "@/lib/api/auth-cookies";
import { crossOriginFailure, isSameOrigin } from "@/lib/api/storefront-api";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getWebAuth } from "@/lib/auth/better-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  let signOutResponse: Response | null = null;
  try {
    const auth = getWebAuth();
    signOutResponse = await auth.api.signOut({
      headers: request.headers,
      asResponse: true,
    });
  } catch (error) {
    console.error("[session] Sign out failed", error);
  } finally {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
  return jsonResponseWithCookies(
    { ok: true, message: "Signed out.", redirectTo: "/" },
    signOutResponse,
  );
}
