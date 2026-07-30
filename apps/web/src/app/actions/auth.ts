"use server";

import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

async function requestOrigin(): Promise<string> {
  const headerStore = await headers();
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export async function signInAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse(fields(formData));
  if (!parsed.success) return validationFailure("Check the form.", parsed.error);
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      return { ok: false, message: "Email or password is incorrect." };
    }
    if (data.user) await mergeGuestCartAfterAuthentication(data.user.id);
    redirect(safeInternalPath(String(formData.get("next") ?? ""), "/account"));
  } catch (error) {
    unstable_rethrow(error);
    console.error("Sign in failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return {
      ok: false,
      message: "Sign in is temporarily unavailable. Please try again.",
    };
  }
}

export async function signUpAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse(fields(formData));
  if (!parsed.success) return validationFailure("Check the form.", parsed.error);

  try {
    const supabase = await createSupabaseServerClient();
    const origin = await requestOrigin();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/account`,
        data: { full_name: parsed.data.fullName },
      },
    });
    if (error) return { ok: false, message: "Unable to create your account." };
    if (data.session) {
      return {
        ok: true,
        message: "Your account is ready.",
        redirectTo: "/account",
      };
    }
    return {
      ok: true,
      message: "Check your email to confirm your account.",
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Sign up failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return {
      ok: false,
      message: "Account creation is temporarily unavailable. Please try again.",
    };
  }
}

export async function forgotPasswordAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse(fields(formData));
  if (!parsed.success) return validationFailure("Check the form.", parsed.error);
  try {
    const supabase = await createSupabaseServerClient();
    const origin = await requestOrigin();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
    });
    // Do not reveal whether an account exists.
    return {
      ok: true,
      message: "If that address has an account, a reset link is on its way.",
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("Password reset request failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return {
      ok: false,
      message: "Password reset is temporarily unavailable. Please try again.",
    };
  }
}

export async function resetPasswordAction(
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse(fields(formData));
  if (!parsed.success) return validationFailure("Check the form.", parsed.error);
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: "Your reset session has expired." };
    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });
    if (error) return { ok: false, message: "Unable to update the password." };
    await supabase.auth.signOut();
    redirect("/auth/login?reset=success");
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

export async function signInWithGoogleAction(formData: FormData) {
  try {
    const supabase = await createSupabaseServerClient();
    const origin = await requestOrigin();
    const next = safeInternalPath(
      String(formData.get("next") ?? ""),
      "/account",
    );
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error || !data.url) redirect("/auth/login?error=oauth");
    redirect(data.url);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Google sign in failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    redirect("/auth/login?error=oauth");
  }
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
