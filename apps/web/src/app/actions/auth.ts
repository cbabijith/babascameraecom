"use server";

import { cookies } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { APIError } from "better-auth";
import { getRequestOrigin, getWebRequest, getWebAuth } from "@/lib/auth/better-auth";
import { signOutSession } from "@/lib/auth/session";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/auth/schemas";
import { safeInternalPath } from "@/lib/auth/safe-redirect";
import { mergeGuestCartAfterAuthentication } from "@/lib/cart-session";

export interface AuthActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
  redirectTo?: string;
}

function fields(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value)]),
  );
}

function validationFailure(
  message: string,
  error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } },
): AuthActionState {
  return { ok: false, message, fieldErrors: error.flatten().fieldErrors };
}

async function applyAuthCookies(response: Response): Promise<void> {
  const cookieStore = await cookies();
  for (const header of response.headers.getSetCookie?.() ?? []) {
    const [pair, ...attributes] = header.split(";");
    const separator = pair.indexOf("=");
    if (separator === -1) continue;
    const name = pair.slice(0, separator).trim();
    let value = pair.slice(separator + 1).trim();
    if (!name) continue;
    // Next re-encodes cookie values on serialization; decode first so the
    // round trip reproduces better-auth's original value exactly.
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
    if (process.env.NODE_ENV === "production") options.secure = true;
    cookieStore.set(name, value, options);
  }
}

function actionMessage(error: unknown, fallback: string): string {
  if (error instanceof APIError) {
    const body = error.body as { message?: string } | string | undefined;
    if (typeof body === "string" && body) return body;
    if (body && typeof body === "object" && body.message) return body.message;
    return error.message || fallback;
  }
  return fallback;
}

export async function signInAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(fields(formData));
  if (!parsed.success) return validationFailure("Check the form.", parsed.error);
  try {
    const origin = await getRequestOrigin();
    const auth = getWebAuth(origin);
    const request = await getWebRequest();
    const response = await auth.api.signInEmail({
      body: parsed.data,
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
      return { ok: false, message };
    }
    await applyAuthCookies(response);
    const data = (await response.json().catch(() => ({}))) as {
      user?: { id?: string };
    };
    if (data.user?.id) {
      await mergeGuestCartAfterAuthentication(data.user.id).catch(() => null);
    }
    redirect(safeInternalPath(String(formData.get("next") ?? ""), "/account"));
  } catch (error) {
    unstable_rethrow(error);
    console.error("Sign in failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return {
      ok: false,
      message: actionMessage(error, "Sign in is temporarily unavailable. Please try again."),
    };
  }
}

export async function signUpAction(
  formData: FormData,
): Promise<AuthActionState> {
  const fieldsData = fields(formData);
  const email = fieldsData.email?.trim() ?? "";
  const password = fieldsData.password ?? "";
  const emailPrefix = email.includes("@") ? email.split("@")[0] : "User";
  const nameFromEmail = emailPrefix
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const fullName = fieldsData.fullName?.trim() || nameFromEmail;
  const confirmPassword = fieldsData.confirmPassword || password;

  const parsed = registerSchema.safeParse({
    ...fieldsData,
    fullName,
    email,
    password,
    confirmPassword,
  });
  if (!parsed.success) return validationFailure("Check the form.", parsed.error);

  try {
    const origin = await getRequestOrigin();
    const auth = getWebAuth(origin);
    const request = await getWebRequest();
    const response = await auth.api.signUpEmail({
      body: {
        email: parsed.data.email,
        password: parsed.data.password,
        name: fullName,
      },
      headers: request.headers,
      asResponse: true,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      let message = "Unable to create your account.";
      try {
        message = JSON.parse(text)?.message || message;
      } catch {
        /* keep default */
      }
      return { ok: false, message };
    }
    await applyAuthCookies(response);
    const data = (await response.json().catch(() => ({}))) as {
      user?: { id?: string };
    };
    if (data.user?.id) {
      await mergeGuestCartAfterAuthentication(data.user.id).catch(() => null);
    }
    return {
      ok: true,
      message: "Your account is ready.",
      redirectTo: "/account",
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Sign up failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return {
      ok: false,
      message: actionMessage(error, "Account creation is temporarily unavailable. Please try again."),
    };
  }
}

export async function forgotPasswordAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse(fields(formData));
  if (!parsed.success) return validationFailure("Check the form.", parsed.error);
  // No mail transport is configured on the storefront; respond generically so
  // account existence is never leaked.
  return {
    ok: true,
    message: "If that address has an account, a reset link is on its way.",
  };
}

export async function resetPasswordAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse(fields(formData));
  if (!parsed.success) return validationFailure("Check the form.", parsed.error);
  try {
    const auth = getWebAuth();
    const request = await getWebRequest();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return { ok: false, message: "Your reset session has expired." };
    }
    const { hashPassword } = await import("better-auth/crypto");
    const { and, eq, getDatabase, accounts } = await import("@babascamera/db");
    const hashed = await hashPassword(parsed.data.password);
    const database = getDatabase();
    await database
      .update(accounts)
      .set({ password: hashed, updatedAt: new Date() })
      .where(
        and(
          eq(accounts.userId, session.user.id),
          eq(accounts.providerId, "credential"),
        ),
      );
    await signOutSession();
    redirect("/login?reset=success");
  } catch (error) {
    unstable_rethrow(error);
    console.error("Password update failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return {
      ok: false,
      message: "The password could not be updated. Please try again.",
    };
  }
}

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  // better-auth's /sign-in/social endpoint is POST-only: start the OAuth flow
  // server-side, forward the CSRF state cookie to the browser, then redirect
  // to the Google authorization URL it returns. The callback lands on
  // /api/auth/callback/google, which creates the session and returns the
  // user to callbackURL. Used as a <form action>, so it must return void.
  const next = safeInternalPath(String(formData.get("next") ?? ""), "/account");
  try {
    const origin = await getRequestOrigin();
    const auth = getWebAuth(origin);
    const request = await getWebRequest();
    const response = await auth.api.signInSocial({
      body: { provider: "google", callbackURL: next },
      headers: request.headers,
      asResponse: true,
    });
    if (!response.ok) {
      redirect("/login?error=oauth");
    }
    await applyAuthCookies(response);
    const data = (await response.json().catch(() => ({}))) as {
      url?: string;
    };
    if (!data.url) {
      redirect("/login?error=oauth");
    }
    redirect(data.url as string);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Google sign-in failed to start", {
      type: error instanceof Error ? error.name : typeof error,
    });
    redirect("/login?error=oauth");
  }
}

export async function signOutAction() {
  await signOutSession();
  redirect("/");
}
