import { and, eq, getDatabase, accounts } from "@babascamera/db";
import { hashPassword } from "better-auth/crypto";

import { jsonResponseWithCookies } from "@/lib/api/auth-cookies";
import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
} from "@/lib/api/storefront-api";
import { getWebAuth } from "@/lib/auth/better-auth";
import { resetPasswordSchema } from "@/lib/auth/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponseWithCookies(
      {
        ok: false,
        message: "Check the form.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      null,
      422,
    );
  }
  try {
    const auth = getWebAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return jsonResponseWithCookies(
        { ok: false, message: "Your reset session has expired." },
        null,
        401,
      );
    }
    const hashed = await hashPassword(parsed.data.password);
    await getDatabase()
      .update(accounts)
      .set({ password: hashed, updatedAt: new Date() })
      .where(
        and(
          eq(accounts.userId, session.user.id),
          eq(accounts.providerId, "credential"),
        ),
      );
    const signOutResponse = await auth.api.signOut({
      headers: request.headers,
      asResponse: true,
    });
    return jsonResponseWithCookies(
      { ok: true, message: "Password updated.", redirectTo: "/login?reset=success" },
      signOutResponse,
    );
  } catch (error) {
    console.error("Password update failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return jsonResponseWithCookies(
      { ok: false, message: "The password could not be updated. Please try again." },
      null,
      500,
    );
  }
}
