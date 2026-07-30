import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type Permission =
  | "dashboard"
  | "orders"
  | "catalog"
  | "customers"
  | "promotions"
  | "reviews"
  | "settings";

const ADMIN_PERMISSIONS: Permission[] = [
  "dashboard",
  "orders",
  "catalog",
  "customers",
  "promotions",
  "reviews",
  "settings",
];

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: "admin";
  roles: ["admin"];
  permissions: Permission[];
  avatarUrl: string | null;
};

export type AdminAccessResult =
  | { kind: "anonymous" }
  | { kind: "forbidden"; reason: string }
  | { kind: "authorized"; admin: AdminUser };

type AdminProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "customer" | "admin";
  avatar_url: string | null;
};

export function permissionsForRoles(roles: readonly string[]): Permission[] {
  return roles.includes("admin") ? [...ADMIN_PERMISSIONS] : [];
}

export async function resolveAdminAccess(
  supabase: SupabaseClient,
): Promise<AdminAccessResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { kind: "anonymous" };

  const { data, error } = await supabase
    .from("users")
    .select("id,email,full_name,role,avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const profile = data as AdminProfileRow | null;

  if (error) {
    return {
      kind: "forbidden",
      reason: "Your administrator profile could not be verified.",
    };
  }
  if (!profile || profile.role !== "admin") {
    return {
      kind: "forbidden",
      reason: "This account does not have administrator access.",
    };
  }

  return {
    kind: "authorized",
    admin: {
      id: profile.id,
      email: profile.email || user.email || "",
      fullName:
        profile.full_name?.trim() ||
        user.user_metadata.full_name ||
        user.email?.split("@")[0] ||
        "Administrator",
      role: "admin",
      roles: ["admin"],
      permissions: [...ADMIN_PERMISSIONS],
      avatarUrl: profile.avatar_url,
    },
  };
}

export async function getAdminAccess() {
  return resolveAdminAccess(await createClient());
}

export async function requireAdmin() {
  const access = await getAdminAccess();
  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "forbidden") {
    redirect(`/unauthorized?reason=${encodeURIComponent(access.reason)}`);
  }
  return access.admin;
}

export function hasPermission(admin: AdminUser, permission: Permission) {
  return admin.permissions.includes(permission);
}

export function hasAnyRole(admin: AdminUser, allowedRoles: readonly string[]) {
  return allowedRoles.includes(admin.role);
}

export async function requirePermission(permission: Permission) {
  const admin = await requireAdmin();
  if (!hasPermission(admin, permission)) {
    redirect(
      `/unauthorized?reason=${encodeURIComponent(
        "Your administrator account does not permit this operation.",
      )}`,
    );
  }
  return admin;
}

export async function requireAnyRole(allowedRoles: readonly string[]) {
  const admin = await requireAdmin();
  if (!hasAnyRole(admin, allowedRoles)) {
    redirect(
      `/unauthorized?reason=${encodeURIComponent(
        "Your administrator account does not permit this operation.",
      )}`,
    );
  }
  return admin;
}

