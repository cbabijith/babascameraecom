"use server";

import { headers } from "next/headers";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth, db, eq, users } from "@babascamera/db";
import { safeReturnPath } from "@/lib/auth/safe-path";

function loginError(message: string, next: string): never {
  const params = new URLSearchParams({ error: message, next });
  redirect(`/login?${params}`);
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeReturnPath(formData.get("next"));
  if (!email || !password) loginError("Enter your email and password.", next);

  try {
    const reqHeaders = await headers();
    const response = await auth.api.signInEmail({
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

    // Forward cookies from response
    const cookiesList = response.headers.getSetCookie();
    const cookieStore = await cookies();
    for (const c of cookiesList) {
      const parts = c.split(";")[0]?.split("=");
      if (parts && parts[0] && parts[1]) {
        cookieStore.set(parts[0].trim(), decodeURIComponent(parts.slice(1).join("=")), {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
      }
    }
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
    const response = await auth.api.signOut({
      headers: reqHeaders,
      asResponse: true,
    });
    const cookiesList = response.headers.getSetCookie();
    const cookieStore = await cookies();
    for (const c of cookiesList) {
      const parts = c.split(";")[0]?.split("=");
      if (parts && parts[0]) {
        cookieStore.delete(parts[0].trim());
      }
    }
  } catch {
    // Ignore error
  }
  redirect("/login");
}
