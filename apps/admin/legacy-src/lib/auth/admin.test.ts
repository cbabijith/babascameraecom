import { describe, expect, it } from "bun:test";

import {
  hasAnyRole,
  permissionsForRoles,
  type AdminUser,
} from "@/lib/auth/admin";

const administrator: AdminUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@example.invalid",
  fullName: "Administrator",
  role: "admin",
  roles: ["admin"],
  permissions: permissionsForRoles(["admin"]),
  avatarUrl: null,
};

describe("admin capability boundaries", () => {
  it("grants the complete operations workspace only to the admin role", () => {
    expect(administrator.permissions).toEqual(
      expect.arrayContaining([
        "dashboard",
        "orders",
        "catalog",
        "customers",
        "promotions",
        "reviews",
        "settings",
      ]),
    );
    expect(permissionsForRoles(["customer"])).toEqual([]);
  });

  it("never treats a customer role as an administrator", () => {
    expect(hasAnyRole(administrator, ["admin"])).toBeTrue();
    expect(hasAnyRole(administrator, ["customer"])).toBeFalse();
  });
});

