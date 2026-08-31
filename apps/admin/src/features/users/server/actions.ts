"use server";

import { and, db, eq, users } from "@babascamera/db";
import { z } from "zod";

import {
  actionFailure,
  actionFailureFromError,
  actionSuccess,
  AdminActionError,
  type AdminActionResult,
  validationFailure,
} from "@/lib/actions/result";
import { requirePermission } from "@/features/auth/server/admin";
import { adminEvents, domainEvent } from "@/lib/events";

const promoteUserSchema = z.object({
  id: z.string().uuid(),
});

export type PromoteUserResult = AdminActionResult<{ id: string; role: "admin" }>;

export async function promoteUserToAdminAction(
  formData: FormData,
): Promise<PromoteUserResult> {
  const admin = await requirePermission("users");
  const parsed = promoteUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const current = await db.query.users.findFirst({
      where: (table, { eq: equals }) => equals(table.id, parsed.data.id),
      columns: { id: true, role: true, isActive: true },
    });
    if (!current) return actionFailure("User not found.");
    if (current.role === "admin") {
      return actionSuccess({ id: current.id, role: "admin" });
    }
    if (!current.isActive) {
      return actionFailure("Reactivate this customer before promoting the account.");
    }

    const [updated] = await db
      .update(users)
      .set({ role: "admin", updatedAt: new Date() })
      .where(and(eq(users.id, current.id), eq(users.role, "customer")))
      .returning({ id: users.id, role: users.role });
    if (!updated || updated.role !== "admin") {
      throw new AdminActionError("The account changed before it could be promoted. Refresh and try again.");
    }

    await adminEvents.emit(
      domainEvent("user.role_changed", {
        actorId: admin.id,
        userId: updated.id,
        role: "admin",
      }),
    );
    return actionSuccess({ id: updated.id, role: "admin" });
  } catch (error) {
    return actionFailureFromError(error, "The user could not be promoted.", "Administrator promotion failed.");
  }
}
