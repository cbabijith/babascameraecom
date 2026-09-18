import { db, eq, coupons } from "@babascamera/db";
import { z } from "zod";

import { apiError, apiSuccess, authorizeAdminApi } from "@/lib/api/admin-api";
import { AdminActionError } from "@/lib/actions/result";
import { adminEvents, domainEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

interface RouteContext { params: Promise<{ id: string }> }

export async function DELETE(request: Request, context: RouteContext) {
  const authorization = await authorizeAdminApi(request, "promotions");
  if ("response" in authorization) return authorization.response;
  const { id } = await context.params;
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return apiError("COUPON_NOT_FOUND", "Coupon not found.", 404);
  }

  try {
    const [updated] = await db
      .update(coupons)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(coupons.id, parsedId.data))
      .returning({ id: coupons.id, code: coupons.code });
    if (!updated) throw new AdminActionError("Coupon not found.");

    await adminEvents.emit(
      domainEvent("coupon.changed", {
        actorId: authorization.admin.id,
        couponId: updated.id,
        code: updated.code,
        action: "disabled",
      }),
    );
    return apiSuccess(null);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return apiError("COUPON_OPERATION_FAILED", error.message, 409);
    }
    console.error("Coupon disable failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "Coupon could not be disabled.", 500);
  }
}
