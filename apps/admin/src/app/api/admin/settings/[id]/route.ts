import { db, eq, settings } from "@babascamera/db";
import { z } from "zod";

import { apiError, apiSuccess, authorizeAdminApi } from "@/lib/api/admin-api";
import { AdminActionError } from "@/lib/actions/result";
import { adminEvents, domainEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

interface RouteContext { params: Promise<{ id: string }> }

export async function DELETE(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminApi(request, "settings");
  if ("response" in authorization) return authorization.response;
  const { id } = await context.params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return apiError("SETTING_NOT_FOUND", "Setting not found.", 404);
  }

  try {
    const [deleted] = await db
      .delete(settings)
      .where(eq(settings.id, parsedId.data))
      .returning({ id: settings.id, key: settings.key });
    if (!deleted) throw new AdminActionError("Setting not found.");

    await adminEvents.emit(
      domainEvent("settings.changed", { key: deleted.key }),
    );
    return apiSuccess(null);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return apiError("SETTINGS_OPERATION_FAILED", error.message, 409);
    }
    console.error("Setting deletion failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "Setting could not be deleted.", 500);
  }
}
