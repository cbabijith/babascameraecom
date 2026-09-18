import { db, eq, reviews } from "@babascamera/db";
import { z } from "zod";

import { apiError, apiSuccess, authorizeAdminApi } from "@/lib/api/admin-api";
import { AdminActionError } from "@/lib/actions/result";
import { adminEvents, domainEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

interface RouteContext { params: Promise<{ id: string }> }

export async function DELETE(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminApi(request, "reviews");
  if ("response" in authorization) return authorization.response;
  const { id } = await context.params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return apiError("REVIEW_NOT_FOUND", "Review not found.", 404);
  }

  try {
    const [deleted] = await db
      .delete(reviews)
      .where(eq(reviews.id, parsedId.data))
      .returning({ id: reviews.id });
    if (!deleted) throw new AdminActionError("Review not found.");

    await adminEvents.emit(
      domainEvent("review.changed", {
        actorId: authorization.admin.id,
        reviewId: parsedId.data,
        action: "deleted",
      }),
    );
    return apiSuccess(null);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return apiError("REVIEW_OPERATION_FAILED", error.message, 409);
    }
    console.error("Review deletion failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "Review could not be deleted.", 500);
  }
}
