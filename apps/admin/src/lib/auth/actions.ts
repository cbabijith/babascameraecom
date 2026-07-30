"use server";

import { redirect } from "next/navigation";

import { resolveAdminAccess } from "@/lib/auth/admin";
import { safeReturnPath } from "@/lib/auth/safe-path";
import { createClient } from "@/lib/supabase/server";

function loginError(message: string, next: string): never {
  const params = new URLSearchParams({ error: message, next });
  redirect(`/login?${params}`);
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeReturnPath(formData.get("next"));
  if (!email || !password) loginError("Enter your email and password.", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) loginError("The email or password is incorrect.", next);
  const access = await resolveAdminAccess(supabase);
  if (access.kind !== "authorized") {
    await supabase.auth.signOut();
    loginError(
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
