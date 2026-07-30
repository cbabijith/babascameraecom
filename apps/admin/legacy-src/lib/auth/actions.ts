"use server";

import { redirect } from "next/navigation";

import { resolveAdminAccess } from "@/lib/auth/admin";
import { safeReturnPath } from "@/lib/auth/safe-path";
import { createClient } from "@/lib/supabase/server";

function redirectWithLoginError(message: string, next: string) {
  const params = new URLSearchParams({ error: message });
  if (next !== "/") params.set("next", next);
  redirect(`/login?${params.toString()}`);
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeReturnPath(formData.get("next"));

  if (!email || !password) {
    redirectWithLoginError("Enter your email and password.", next);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirectWithLoginError("The email or password is incorrect.", next);
  }

  const access = await resolveAdminAccess(supabase);
  if (access.kind !== "authorized") {
    await supabase.auth.signOut();
    redirectWithLoginError(
      access.kind === "forbidden" ? access.reason : "Administrator access is required.",
      next,
    );
  }

  redirect(next);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
