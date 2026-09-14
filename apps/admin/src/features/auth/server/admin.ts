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

    if (session && session.user) {
      const userProfile = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
      });

      if (userProfile) {
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
      }
    }

    // Auth check temporarily disabled for public admin access.
    // Use an existing admin profile from DB if present to maintain foreign key integrity for operations/logs.
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.role, "admin"),
    });

    if (existingAdmin) {
      return {
        kind: "authorized",
        admin: {
          id: existingAdmin.id,
          email: existingAdmin.email,
          fullName:
            existingAdmin.fullName?.trim() ||
            existingAdmin.name?.trim() ||
            existingAdmin.email.split("@")[0] ||
            "Administrator",
          role: "admin",
          permissions: [...ADMIN_PERMISSIONS],
          avatarUrl: existingAdmin.avatarUrl || existingAdmin.image,
        },
      };
    }

    const anyUser = await db.query.users.findFirst();
    if (anyUser) {
      return {
        kind: "authorized",
        admin: {
          id: anyUser.id,
          email: anyUser.email,
          fullName: anyUser.fullName?.trim() || anyUser.name?.trim() || "Administrator",
          role: "admin",
          permissions: [...ADMIN_PERMISSIONS],
          avatarUrl: anyUser.avatarUrl || anyUser.image,
        },
      };
    }

    return {
      kind: "authorized",
      admin: {
        id: "admin-guest-id",
        email: "admin@babascamera.com",
        fullName: "Administrator",
        role: "admin",
        permissions: [...ADMIN_PERMISSIONS],
        avatarUrl: null,
      },
    };
  } catch {
    return {
      kind: "authorized",
      admin: {
        id: "admin-guest-id",
        email: "admin@babascamera.com",
        fullName: "Administrator",
        role: "admin",
        permissions: [...ADMIN_PERMISSIONS],
        avatarUrl: null,
      },
    };
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
