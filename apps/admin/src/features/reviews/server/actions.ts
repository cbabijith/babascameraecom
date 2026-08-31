"use server";

import { db, eq, reviews } from "@babascamera/db";

import {
  actionFailureFromError,
  actionSuccess,
  AdminActionError,
  type AdminActionResult,
  validationFailure,
} from "@/lib/actions/result";
import { requirePermission } from "@/features/auth/server/admin";
import { adminEvents, domainEvent } from "@/lib/events";
import { formBooleanSchema, idSchema } from "@/lib/forms/zod-forms";

const reviewApprovalSchema = idSchema.extend({ isApproved: formBooleanSchema });

export async function setReviewApprovalAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requirePermission("reviews");
  try {
    const parsed = reviewApprovalSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFailure(parsed.error);

    const [updated] = await db
      .update(reviews)
      .set({
        isApproved: parsed.data.isApproved,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, parsed.data.id))
      .returning({ id: reviews.id });
    if (!updated) throw new AdminActionError("Review not found.");

    await adminEvents.emit(
      domainEvent("review.changed", {
        actorId: admin.id,
        reviewId: parsed.data.id,
        action: parsed.data.isApproved ? "approved" : "hidden",
      }),
    );
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Review approval could not be changed.",
      "Review approval update failed.",
    );
  }
}

export async function deleteReviewAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requirePermission("reviews");
  try {
    const parsed = idSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFailure(parsed.error);

    const [deleted] = await db
      .delete(reviews)
      .where(eq(reviews.id, parsed.data.id))
      .returning({ id: reviews.id });
    if (!deleted) throw new AdminActionError("Review not found.");

    await adminEvents.emit(
      domainEvent("review.changed", {
        actorId: admin.id,
        reviewId: parsed.data.id,
        action: "deleted",
      }),
    );
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Review could not be deleted.",
      "Review deletion failed.",
    );
  }
}
