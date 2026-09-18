import { z } from "zod";

import { jsonResponseWithCookies } from "@/lib/api/auth-cookies";
import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
} from "@/lib/api/storefront-api";
import { getRequestOrigin, getWebAuth } from "@/lib/auth/better-auth";
import { registerSchema } from "@/lib/auth/schemas";
import { mergeGuestCartAfterAuthentication } from "@/lib/cart-session";

export const dynamic = "force-dynamic";

const bodySchema = registerSchema.extend({ next: z.string().optional() });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const fields = (body ?? {}) as Record<string, unknown>;
  const email = typeof fields.email === "string" ? fields.email.trim() : "";
  const password = typeof fields.password === "string" ? fields.password : "";
  const emailPrefix = email.includes("@") ? email.split("@")[0] : "User";
  const nameFromEmail = emailPrefix
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const parsed = bodySchema.safeParse({
    ...fields,
    email,
    password,
    fullName:
      typeof fields.fullName === "string" && fields.fullName.trim()
        ? fields.fullName
        : nameFromEmail,
    confirmPassword: fields.confirmPassword ?? password,
  });
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

  const fullName =
    parsed.data.fullName?.trim() || nameFromEmail || "New Customer";

  try {
    const origin = await getRequestOrigin();
    const auth = getWebAuth(origin);
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
      return jsonResponseWithCookies({ ok: false, message }, null, 400);
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
        message: "Your account is ready.",
        redirectTo: "/profile",
      },
      response,
    );
  } catch (error) {
    console.error("Sign up failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return jsonResponseWithCookies(
      {
        ok: false,
        message: "Account creation is temporarily unavailable. Please try again.",
      },
      null,
      500,
    );
  }
}
