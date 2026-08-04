"server-only";

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/auth/schemas";
import { mergeGuestCartAfterAuthentication } from "@/lib/cart-session";
import type { User } from "@/types/auth";

export class AuthDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 400, cause?: unknown) {
    super(message, { cause });
    this.name = "AuthDataError";
    this.status = status;
  }
}

export interface AuthResult {
  token: string;
  user: User;
  message?: string;
  redirectTo?: string;
  url?: string;
}

async function getRequestOrigin(): Promise<string> {
  try {
    const headerStore = await headers();
    const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (configured) return configured.replace(/\/+$/, "");
    const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
    const protocol = headerStore.get("x-forwarded-proto") ?? "http";
    return host ? `${protocol}://${host}` : "http://localhost:3000";
  } catch {
    return process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "http://localhost:3000";
  }
}

export async function registerUser(payload: unknown): Promise<AuthResult> {
  const rawObj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const email = typeof rawObj.email === "string" ? rawObj.email.trim() : "";
  const password = typeof rawObj.password === "string" ? rawObj.password : "";

  const emailPrefix = email.includes("@") ? email.split("@")[0] : "User";
  const nameFromEmail = emailPrefix
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const fullName =
    typeof rawObj.fullName === "string" && rawObj.fullName.trim()
      ? rawObj.fullName.trim()
      : nameFromEmail;

  const confirmPassword =
    typeof rawObj.confirmPassword === "string" && rawObj.confirmPassword
      ? rawObj.confirmPassword
      : password;
  console.log(fullName,
    email,
    password,
    confirmPassword,);

  const parsed = registerSchema.safeParse({
    fullName,
    email,
    password,
    confirmPassword,
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid registration details.";
    throw new AuthDataError(firstIssue, 400, parsed.error);
  }

  const { email: validEmail, password: validPassword } = parsed.data;

  if (hasPublicSupabaseConfig()) {
    try {
      const supabase = await createSupabaseServerClient();
      const origin = await getRequestOrigin();
      const { data, error } = await supabase.auth.signUp({
        email: validEmail,
        password: validPassword,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/account`,
          data: { full_name: fullName },
        },
      });

      if (error) {
        throw new AuthDataError(error.message, 400, error);
      }

      const token = data.session?.access_token ?? "mock-auth-token";
      const user: User = {
        id: data.user?.id ?? "user_1",
        email: data.user?.email ?? email,
        name: fullName || data.user?.user_metadata?.full_name || email.split("@")[0],
      };

      if (data.user?.id) {
        await mergeGuestCartAfterAuthentication(data.user.id).catch(() => null);
      }

      return {
        token,
        user,
        message: data.session
          ? "Your account is ready."
          : "Check your email to confirm your account.",
        redirectTo: data.session ? "/account" : undefined,
      };
    } catch (err: unknown) {
      if (err instanceof AuthDataError) throw err;
      throw new AuthDataError(
        err instanceof Error ? err.message : "Registration failed",
        400,
        err,
      );
    }
  }

  return {
    token: "mock-auth-token",
    user: { id: "user_1", email, name: fullName },
    message: "Your account is ready.",
    redirectTo: "/account",
  };
}

export async function loginUser(payload: unknown): Promise<AuthResult> {
  const rawObj = payload && typeof payload === "object" ? payload : {};
  const parsed = loginSchema.safeParse(rawObj);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid login details.";
    throw new AuthDataError(firstIssue, 400, parsed.error);
  }

  const { email, password } = parsed.data;

  if (hasPublicSupabaseConfig()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        throw new AuthDataError("Invalid email or password.", 401, error);
      }

      await mergeGuestCartAfterAuthentication(data.user.id).catch(() => null);

      const token = data.session?.access_token ?? "mock-auth-token";
      const user: User = {
        id: data.user.id,
        email: data.user.email ?? email,
        name: data.user.user_metadata?.full_name ?? email.split("@")[0],
      };
      return { token, user };
    } catch (err: unknown) {
      if (err instanceof AuthDataError) throw err;
      throw new AuthDataError(
        err instanceof Error ? err.message : "Login failed",
        401,
        err,
      );
    }
  }

  return {
    token: "mock-auth-token",
    user: { id: "user_1", email, name: email.split("@")[0] },
  };
}

export async function googleAuth(options?: { next?: string }): Promise<AuthResult> {
  if (hasPublicSupabaseConfig()) {
    try {
      const supabase = await createSupabaseServerClient();
      const origin = await getRequestOrigin();
      const nextPath = options?.next ?? "/account";
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (error || !data.url) {
        throw new AuthDataError("Google authentication initialization failed.", 400, error);
      }

      return {
        token: "oauth-redirect",
        url: data.url,
        user: { id: "oauth_pending", email: "", name: "Google User" },
      };
    } catch (err: unknown) {
      if (err instanceof AuthDataError) throw err;
      throw new AuthDataError(
        err instanceof Error ? err.message : "Google authentication failed",
        400,
        err,
      );
    }
  }

  return {
    token: "mock-google-token",
    user: { id: "g_user_1", email: "googleuser@example.com", name: "Google User" },
  };
}

export async function forgotPassword(payload: unknown): Promise<{ message: string }> {
  const rawObj = payload && typeof payload === "object" ? payload : {};
  const parsed = forgotPasswordSchema.safeParse(rawObj);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid email address.";
    throw new AuthDataError(firstIssue, 400, parsed.error);
  }

  const { email } = parsed.data;

  if (hasPublicSupabaseConfig()) {
    try {
      const supabase = await createSupabaseServerClient();
      const origin = await getRequestOrigin();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
      });
    } catch {
      // Intentionally suppressed to avoid leaking account existence
    }
  }

  return { message: "If that address has an account, a reset link is on its way." };
}

export async function resetPassword(payload: unknown): Promise<{ message: string }> {
  const rawObj = payload && typeof payload === "object" ? payload : {};
  const parsed = resetPasswordSchema.safeParse(rawObj);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid password.";
    throw new AuthDataError(firstIssue, 400, parsed.error);
  }

  const { password } = parsed.data;

  if (hasPublicSupabaseConfig()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new AuthDataError("Your password reset session has expired.", 401);
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw new AuthDataError(error.message, 400, error);
      }
      await supabase.auth.signOut();
    } catch (err: unknown) {
      if (err instanceof AuthDataError) throw err;
      throw new AuthDataError(
        err instanceof Error ? err.message : "Failed to reset password",
        400,
        err,
      );
    }
  }

  return { message: "Password reset successfully." };
}

export async function logoutUser(): Promise<{ message: string }> {
  if (hasPublicSupabaseConfig()) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {
      // Suppress signout errors
    }
  }
  return { message: "Logged out successfully." };
}

export async function getUserProfile(): Promise<User> {
  if (hasPublicSupabaseConfig()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        return {
          id: user.id,
          email: user.email ?? "",
          name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
          status: "Active",
          phone: user.phone || (user.user_metadata?.phone as string ?? ""),
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    id: "user_1",
    email: "user@example.com",
    name: "Customer",
    status: "Active",
  };
}

export async function updateUserProfile(
  payload: Record<string, unknown>,
): Promise<{ message: string; result: Record<string, unknown> }> {
  if (hasPublicSupabaseConfig()) {
    try {
      const supabase = await createSupabaseServerClient();
      const updateData: Record<string, unknown> = {};
      if (typeof payload.name === "string") updateData.full_name = payload.name;
      if (typeof payload.phone === "string") updateData.phone = payload.phone;
      if (Object.keys(updateData).length) {
        await supabase.auth.updateUser({ data: updateData });
      }
    } catch {
      // Suppress profile update errors
    }
  }

  return { message: "Profile updated successfully.", result: payload };
}
