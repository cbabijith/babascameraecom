import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth, db, eq, users } from "@babascamera/db";

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
  "dashboard",
  "orders",
  "catalog",
  "customers",
  "users",
  "promotions",
  "reviews",
  "storefront",
  "settings",
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

export async function resolveAdminAccess(): Promise<AdminAccessResult> {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({
      headers: reqHeaders,
    });

    if (!session || !session.user) {
      return { kind: "anonymous" };
    }

    const userProfile = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!userProfile) {
      return { kind: "forbidden", reason: "Your administrator profile could not be verified." };
    }

    if (userProfile.role !== "admin" || userProfile.isActive === false) {
      return { kind: "forbidden", reason: "This account does not have active administrator access." };
    }

    return {
      kind: "authorized",
      admin: {
        id: userProfile.id,
        email: userProfile.email,
        fullName:
          userProfile.fullName?.trim() ||
          userProfile.name?.trim() ||
          userProfile.email.split("@")[0] ||
          "Administrator",
        role: "admin",
        permissions: [...ADMIN_PERMISSIONS],
        avatarUrl: userProfile.avatarUrl || userProfile.image,
      },
    };
  } catch {
    return { kind: "anonymous" };
  }
}

const getRequiredAdmin = cache(async () => {
  const access = await resolveAdminAccess();
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
