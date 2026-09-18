import { eq, db, users } from "@babascamera/db";
import { z } from "zod";

import { isSameOrigin } from "@/lib/api/admin-api";
import { getAdminAuth, getRequestOrigin } from "@/lib/auth/auth";
import { safeReturnPath } from "@/lib/auth/safe-path";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().trim().max(320).default(""),
  password: z.string().max(72).default(""),
  next: z.string().optional(),
});

function loginError(message: string, status = 401) {
  return Response.json(
    { success: false, error: { code: "LOGIN_FAILED", message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function jsonResponseWithCookies(
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

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return loginError("Cross-origin sign-in is not allowed.", 403);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return loginError("Enter your email and password.", 400);

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const next = safeReturnPath(parsed.data.next ?? null);
  if (!email || !password) return loginError("Enter your email and password.", 400);

  try {
    const origin = await getRequestOrigin();
    const authInstance = getAdminAuth(origin);

    const response = await authInstance.api.signInEmail({
      body: { email, password },
      headers: request.headers,
      asResponse: true,
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      return loginError(errBody?.message || "The email or password is incorrect.");
    }

    // Check if user has admin role
    const userProfile = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!userProfile || userProfile.role !== "admin" || userProfile.isActive === false) {
      return loginError("This account does not have active administrator access.", 403);
    }

    return jsonResponseWithCookies(
      {
        success: true,
        data: { redirectTo: next === "/login" ? "/dashboard" : next },
      },
      response,
    );
  } catch (error) {
    console.error("Admin sign-in failed", error);
    return loginError("Sign in is temporarily unavailable. Please try again.", 500);
  }
}
