import "server-only";

import type { User } from "@supabase/supabase-js";
import { createClient } from "./server";
import { isActiveAccountStatus } from "@/lib/auth/account-status";

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "AuthenticationRequiredError";
  }
}

export class AccountInactiveError extends Error {
  readonly status = 403;

  constructor() {
    super("This account is suspended or disabled.");
    this.name = "AccountInactiveError";
  }
}

export async function getAuthenticatedUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthenticationRequiredError();
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    throw new Error("Unable to verify account status.");
  }
  if (!profile || !isActiveAccountStatus(profile.account_status)) {
    throw new AccountInactiveError();
  }

  return user;
}
