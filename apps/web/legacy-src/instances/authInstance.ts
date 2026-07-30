"use client";

import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type {
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  User,
} from "@/types/auth";
import { safeRelativePath } from "@/lib/auth/safe-redirect";
import { isActiveAccountStatus } from "@/lib/auth/account-status";

type ProfileSummary = {
  full_name: string | null;
  customer_type: string;
  account_status: string;
};

function toUser(user: SupabaseUser, profile?: ProfileSummary | null): User {
  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? "",
    name:
      profile?.full_name ||
      (typeof metadata.full_name === "string" && metadata.full_name) ||
      (typeof metadata.name === "string" && metadata.name) ||
      undefined,
    userType:
      profile?.customer_type ||
      (typeof metadata.user_type === "string" ? metadata.user_type : undefined),
    status: profile?.account_status,
  };
}

async function activeUser(
  supabase: ReturnType<typeof createClient>,
  user: SupabaseUser,
): Promise<User> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name,customer_type,account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("Unable to verify account status.");
  if (!profile || !isActiveAccountStatus(profile.account_status)) {
    await supabase.auth.signOut();
    throw new Error("This account is suspended or disabled.");
  }
  return toUser(user, profile);
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function registerUser(
  payload: RegisterPayload,
): Promise<{ token: string; user: User }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email: payload.email.trim(),
    password: payload.password,
    options: {
      data: payload.name ? { full_name: payload.name.trim() } : undefined,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Registration failed");
  }

  return {
    token: data.session?.access_token ?? "",
    user: toUser(data.user),
  };
}

export async function loginUser(
  payload: LoginPayload,
): Promise<{ token: string; user: User | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email.trim(),
    password: payload.password,
  });

  if (error) throw new Error(error.message);

  return {
    token: data.session?.access_token ?? "",
    user: data.user ? await activeUser(supabase, data.user) : null,
  };
}

export async function signInWithGoogle(next = "/"): Promise<void> {
  const supabase = createClient();
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", safeRelativePath(next));

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) throw new Error(error.message);
}

export async function logoutUser(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<string> {
  const supabase = createClient();
  const redirectTo = new URL("/auth/callback", window.location.origin);
  redirectTo.searchParams.set("next", "/SetNewPassword");

  const { error } = await supabase.auth.resetPasswordForEmail(payload.email.trim(), {
    redirectTo: redirectTo.toString(),
  });
  if (error) throw new Error(error.message);
  return "Password recovery instructions have been sent.";
}

export async function verifyRecoveryOtp(email: string, otp: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: otp.trim(),
    type: "recovery",
  });
  if (error) throw new Error(error.message);
}

export async function resetPassword(password: string): Promise<string> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
  await supabase.auth.signOut({ scope: "local" });
  return "Password updated successfully.";
}

export async function initializeAuth(): Promise<{ user: User | null }> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { user: null };
  return { user: await activeUser(supabase, user) };
}

export async function verifyToken(): Promise<boolean> {
  try {
    const { user } = await initializeAuth();
    return Boolean(user);
  } catch {
    return false;
  }
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null, user: User | null) => void,
) {
  const supabase = createClient();
  return supabase.auth.onAuthStateChange((event, session) => {
    if (!session?.user) {
      callback(event, session, null);
      return;
    }
    void activeUser(supabase, session.user)
      .then((user) => callback(event, session, user))
      .catch(() => callback("SIGNED_OUT", null, null));
  });
}

export function getAuthErrorMessage(error: unknown, fallback = "Authentication failed"): string {
  return errorMessage(error, fallback);
}
