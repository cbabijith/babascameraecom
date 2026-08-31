"use server";

import { and, db, eq, users } from "@babascamera/db";
import { z } from "zod";

import {
  actionFailureFromError,
  actionSuccess,
  AdminActionError,
  type AdminActionResult,
  validationFailure,
} from "@/lib/actions/result";
import { requirePermission } from "@/features/auth/server/admin";
import { adminEvents, domainEvent } from "@/lib/events";

const uuid = z.string().uuid();

const formBooleanSchema = z
  .enum(["true", "false", "1", "0", "on", "off"])
  .transform((value) => value === "true" || value === "1" || value === "on");

const customerStatusSchema = z.object({
  id: uuid,
  isActive: formBooleanSchema,
});

export async function setCustomerActiveAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requirePermission("customers");
  try {
    const parsed = customerStatusSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFailure(parsed.error);

    const [updated] = await db
      .update(users)
      .set({ isActive: parsed.data.isActive, updatedAt: new Date() })
      .where(and(eq(users.id, parsed.data.id), eq(users.role, "customer")))
      .returning({ id: users.id });
    if (!updated) throw new AdminActionError("Customer not found.");

    await adminEvents.emit(
      domainEvent("customer.status_changed", {
        actorId: admin.id,
        customerId: parsed.data.id,
        isActive: parsed.data.isActive,
      }),
    );
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Customer status could not be changed.",
      "Customer status update failed.",
    );
  }
}
