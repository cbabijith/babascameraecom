import { z } from "zod";

import { jsonResponseWithCookies } from "@/lib/api/auth-cookies";
import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
} from "@/lib/api/storefront-api";
import { getRequestOrigin, getWebAuth } from "@/lib/auth/better-auth";
import { safeInternalPath } from "@/lib/auth/safe-redirect";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ next: z.string().optional() });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = bodySchema.safeParse(body);
  const next = safeInternalPath(parsed.success ? parsed.data.next ?? "" : "", "/profile");
  try {
    const origin = await getRequestOrigin();
    const auth = getWebAuth(origin);
    // Start the OAuth flow server-side, forward the CSRF state cookie to the
    // browser, and hand the Google authorization URL back to the client. The
    // callback lands on /api/auth/callback/google, which creates the session
    // and returns the user to the callbackURL.
    const response = await auth.api.signInSocial({
      body: { provider: "google", callbackURL: next },
      headers: request.headers,
      asResponse: true,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const failed =
        text.toLowerCase().includes("disabled") ||
        text.toLowerCase().includes("forbidden")
          ? "/login?error=account_disabled"
          : "/login?error=oauth";
      return jsonResponseWithCookies(
        { ok: false, redirectTo: failed },
        null,
        400,
      );
    }
    const data = (await response.json().catch(() => ({}))) as {
      url?: string;
    };
    if (!data.url) {
      return jsonResponseWithCookies(
        { ok: false, redirectTo: "/login?error=oauth" },
        null,
        400,
      );
    }
    return jsonResponseWithCookies({ ok: true, url: data.url }, response);
  } catch (error) {
    console.error("Google sign-in failed to start", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return jsonResponseWithCookies(
      { ok: false, redirectTo: "/login?error=oauth" },
      null,
      500,
    );
  }
}
