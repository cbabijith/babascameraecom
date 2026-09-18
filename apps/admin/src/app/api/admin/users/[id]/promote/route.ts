import { and, db, eq, users } from "@babascamera/db";
import { z } from "zod";

import { apiError, apiSuccess, authorizeAdminApi } from "@/lib/api/admin-api";
import { AdminActionError } from "@/lib/actions/result";
import { adminEvents, domainEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

interface RouteContext { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminApi(request, "users");
  if ("response" in authorization) return authorization.response;
  const { id } = await context.params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return apiError("USER_NOT_FOUND", "User not found.", 404);
  }

  try {
    const current = await db.query.users.findFirst({
      where: (table, { eq: equals }) => equals(table.id, parsedId.data),
      columns: { id: true, role: true, isActive: true },
    });
    if (!current) return apiError("USER_NOT_FOUND", "User not found.", 404);
    if (current.role === "admin") {
      return apiSuccess({ id: current.id, role: "admin" });
    }
    if (!current.isActive) {
      return apiError(
        "USER_INACTIVE",
        "Reactivate this customer before promoting the account.",
        409,
      );
    }

    const [updated] = await db
      .update(users)
      .set({ role: "admin", updatedAt: new Date() })
      .where(and(eq(users.id, current.id), eq(users.role, "customer")))
      .returning({ id: users.id, role: users.role });
    if (!updated || updated.role !== "admin") {
      throw new AdminActionError(
        "The account changed before it could be promoted. Refresh and try again.",
      );
    }

    await adminEvents.emit(
      domainEvent("user.role_changed", {
        actorId: authorization.admin.id,
        userId: updated.id,
        role: "admin",
      }),
    );
    return apiSuccess({ id: updated.id, role: "admin" });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return apiError("USER_OPERATION_FAILED", error.message, 409);
    }
    console.error("Administrator promotion failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "The user could not be promoted.", 500);
  }
}
