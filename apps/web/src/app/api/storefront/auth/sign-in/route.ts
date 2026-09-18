import { eq, getDatabase, users } from "@babascamera/db";
import { z } from "zod";

import { jsonResponseWithCookies } from "@/lib/api/auth-cookies";
import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
} from "@/lib/api/storefront-api";
import { getRequestOrigin, getWebAuth } from "@/lib/auth/better-auth";
import { loginSchema } from "@/lib/auth/schemas";
import { safeInternalPath } from "@/lib/auth/safe-redirect";
import { mergeGuestCartAfterAuthentication } from "@/lib/cart-session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = loginSchema
    .extend({ next: z.string().optional() })
    .safeParse(body);
  if (!parsed.success) {
    return jsonResponseWithCookies(
      { ok: false, message: "Check the form." },
      null,
      422,
    );
  }

  try {
    const database = getDatabase();
    const [existingUser] = await database
      .select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.email, parsed.data.email.toLowerCase()))
      .limit(1);

    if (existingUser && !existingUser.isActive) {
      return jsonResponseWithCookies(
        {
          ok: false,
          message: "Your account has been disabled. Please contact support.",
        },
        null,
        403,
      );
    }

    const origin = await getRequestOrigin();
    const auth = getWebAuth(origin);
    const response = await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: request.headers,
      asResponse: true,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      let message = "Email or password is incorrect.";
      try {
        message = JSON.parse(text)?.message || message;
      } catch {
        /* keep default */
      }
      return jsonResponseWithCookies({ ok: false, message }, null, 401);
    }
    const data = (await response.json().catch(() => ({}))) as {
      user?: { id?: string };
    };
    if (data.user?.id) {
      await mergeGuestCartAfterAuthentication(data.user.id).catch(() => null);
    }
    return jsonResponseWithCookies(
      {
        ok: true,
        message: "Signed in.",
        redirectTo: safeInternalPath(parsed.data.next ?? "", "/profile"),
      },
      response,
    );
  } catch (error) {
    console.error("Sign in failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return jsonResponseWithCookies(
      {
        ok: false,
        message: "Sign in is temporarily unavailable. Please try again.",
      },
      null,
      500,
    );
  }
}
