import type { SupabaseClient, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type Permission =
  | "dashboard"
  | "orders"
  | "catalog"
  | "customers"
  | "users"
  | "promotions"
  | "reviews"
  | "storefront"
  | "settings";

const ADMIN_PERMISSIONS: Permission[] = [
  "dashboard", "orders", "catalog", "customers", "users", "promotions", "reviews", "storefront", "settings",
];

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: "admin";
  permissions: Permission[];
  avatarUrl: string | null;
}

export type AdminAccessResult =
  | { kind: "anonymous" }
  | { kind: "forbidden"; reason: string }
  | { kind: "authorized"; admin: AdminUser };

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "customer" | "admin";
  avatar_url: string | null;
  is_active: boolean;
}

export async function resolveAdminAccessForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<Exclude<AdminAccessResult, { kind: "anonymous" }>> {
  const { data, error } = await supabase
    .from("users")
    .select("id,email,full_name,role,avatar_url,is_active")
    .eq("id", user.id)
    .maybeSingle();
  const profile = data as Profile | null;
  if (error) {
    return { kind: "forbidden", reason: "Your administrator profile could not be verified." };
  }
  if (!profile || profile.role !== "admin" || profile.is_active === false) {
    return { kind: "forbidden", reason: "This account does not have active administrator access." };
  }
  return {
    kind: "authorized",
    admin: {
      id: profile.id,
      email: profile.email || user.email || "",
      fullName:
        profile.full_name?.trim() ||
        String(user.user_metadata.full_name ?? "") ||
        user.email?.split("@")[0] ||
        "Administrator",
      role: "admin",
      permissions: [...ADMIN_PERMISSIONS],
      avatarUrl: profile.avatar_url,
    },
  };
}

export async function resolveAdminAccess(supabase: SupabaseClient): Promise<AdminAccessResult> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { kind: "anonymous" };
  return resolveAdminAccessForUser(supabase, user);
}

const getRequiredAdmin = cache(async () => {
  const access = await resolveAdminAccess(await createClient());
  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "forbidden") {
    redirect(`/unauthorized?reason=${encodeURIComponent(access.reason)}`);
  }
  return access.admin;
});

export async function requireAdmin() {
  return getRequiredAdmin();
}

export async function requirePermission(permission: Permission) {
  const admin = await requireAdmin();
  if (!admin.permissions.includes(permission)) redirect("/unauthorized");
  return admin;
}
