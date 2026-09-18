import { db, eq, reviews } from "@babascamera/db";
import { z } from "zod";

import { apiError, apiSuccess, authorizeAdminApi } from "@/lib/api/admin-api";
import { AdminActionError } from "@/lib/actions/result";
import { adminEvents, domainEvent } from "@/lib/events";
import { formBooleanSchema } from "@/lib/forms/zod-forms";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  isApproved: formBooleanSchema,
});

interface RouteContext { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminApi(request, "reviews");
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
    return apiError("VALIDATION_FAILED", "Check the submitted fields and try again.", 422);
  }

  try {
    const [updated] = await db
      .update(reviews)
      .set({
        isApproved: parsed.data.isApproved,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, parsedId.data))
      .returning({ id: reviews.id });
    if (!updated) throw new AdminActionError("Review not found.");

    await adminEvents.emit(
      domainEvent("review.changed", {
        actorId: authorization.admin.id,
        reviewId: parsedId.data,
        action: parsed.data.isApproved ? "approved" : "hidden",
      }),
    );
    return apiSuccess(null);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return apiError("REVIEW_OPERATION_FAILED", error.message, 409);
    }
    console.error("Review approval update failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "Review approval could not be changed.", 500);
  }
}
