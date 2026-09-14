"use server";

import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db, eq, users } from "@babascamera/db";
import { getAdminAuth, getRequestOrigin } from "@/lib/auth/auth";
import { safeReturnPath } from "@/lib/auth/safe-path";

function loginError(message: string, next: string): never {
  const params = new URLSearchParams({ error: message, next });
  redirect(`/login?${params}`);
}

async function applyAuthCookies(response: Response, origin: string): Promise<void> {
  const cookieStore = await cookies();
  const isHttps = origin.startsWith("https://");
  for (const header of response.headers.getSetCookie?.() ?? []) {
    const [pair, ...attributes] = header.split(";");
    if (!pair) continue;
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    const name = pair.slice(0, separator).trim();
    let value = pair.slice(separator + 1).trim();
    if (!name) continue;
    try {
      value = decodeURIComponent(value);
    } catch {
      /* keep raw value */
    }
    const options: {
      path: string;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "lax" | "strict" | "none";
      maxAge?: number;
    } = { path: "/" };
    for (const raw of attributes) {
      const part = raw.trim().toLowerCase();
      if (part === "httponly") options.httpOnly = true;
      else if (part === "secure") options.secure = true;
      else if (part.startsWith("samesite=lax")) options.sameSite = "lax";
      else if (part.startsWith("samesite=strict")) options.sameSite = "strict";
      else if (part.startsWith("samesite=none")) options.sameSite = "none";
      else if (part.startsWith("max-age=")) {
        const parsed = Number(part.slice("max-age=".length));
        if (Number.isFinite(parsed)) options.maxAge = parsed;
      }
    }
    if (isHttps) {
      options.secure = true;
    } else {
      delete options.secure;
    }
    cookieStore.set(name, value, options);
  }
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeReturnPath(formData.get("next"));
  if (!email || !password) loginError("Enter your email and password.", next);

  try {
    const reqHeaders = await headers();
    const origin = await getRequestOrigin();
    const authInstance = getAdminAuth(origin);

    const response = await authInstance.api.signInEmail({
      body: { email, password },
      headers: reqHeaders,
      asResponse: true,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      loginError(errBody?.message || "The email or password is incorrect.", next);
    }

    // Check if user has admin role
    const userProfile = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!userProfile || userProfile.role !== "admin" || userProfile.isActive === false) {
      loginError("This account does not have active administrator access.", next);
    }

    await applyAuthCookies(response, origin);
  } catch (error) {
    const digest = (error as { digest?: string })?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : "The email or password is incorrect.";
    loginError(message, next);
  }

  redirect(next === "/login" ? "/dashboard" : next);
}

export async function logoutAction() {
  try {
    const reqHeaders = await headers();
    const origin = await getRequestOrigin();
    const authInstance = getAdminAuth(origin);
    const response = await authInstance.api.signOut({
      headers: reqHeaders,
      asResponse: true,
    });
    await applyAuthCookies(response, origin);
  } catch {
    // Ignore error
  }
  redirect("/login");
}
