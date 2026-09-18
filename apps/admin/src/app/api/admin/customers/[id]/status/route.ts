import { and, db, eq, users } from "@babascamera/db";
import { z } from "zod";

import { apiError, apiSuccess, authorizeAdminApi, zodFieldErrors } from "@/lib/api/admin-api";
import { AdminActionError } from "@/lib/actions/result";
import { adminEvents, domainEvent } from "@/lib/events";
import { formBooleanSchema } from "@/lib/forms/zod-forms";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  isActive: formBooleanSchema,
});

interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminApi(request, "customers");
  if ("response" in authorization) return authorization.response;
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("MALFORMED_REQUEST", "Request body must be valid JSON.", 400);
  }

  const parsedId = z.string().uuid().safeParse(id);
  const parsed = bodySchema.safeParse(body);
  if (!parsedId.success || !parsed.success) {
    const first =
      (!parsed.success
        ? (parsed.error.flatten().formErrors[0] ??
          Object.values(zodFieldErrors(parsed.error))[0]?.[0])
        : undefined) ?? "Check the submitted fields and try again.";
    return apiError("VALIDATION_FAILED", first, 422);
  }

  try {
    const [updated] = await db
      .update(users)
      .set({ isActive: parsed.data.isActive, updatedAt: new Date() })
      .where(and(eq(users.id, parsedId.data), eq(users.role, "customer")))
      .returning({ id: users.id });
    if (!updated) throw new AdminActionError("Customer not found.");

    await adminEvents.emit(
      domainEvent("customer.status_changed", {
        actorId: authorization.admin.id,
        customerId: parsedId.data,
        isActive: parsed.data.isActive,
      }),
    );
    return apiSuccess(null);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return apiError("CUSTOMER_OPERATION_FAILED", error.message, 409);
    }
    console.error("Customer status update failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "Customer status could not be changed.", 500);
  }
}
