import { db, eq, coupons } from "@babascamera/db";

import {
  apiError,
  apiSuccess,
  authorizeAdminApi,
  zodFieldErrors,
} from "@/lib/api/admin-api";
import { AdminActionError } from "@/lib/actions/result";
import { adminEvents, domainEvent } from "@/lib/events";
import { parseMoney } from "@/lib/money";
import { couponSchema } from "@/features/coupons/schemas/coupon-schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authorization = await authorizeAdminApi(request, "promotions");
  if ("response" in authorization) return authorization.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("MALFORMED_REQUEST", "Request body must be valid JSON.", 400);
  }

  const parsed = couponSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const first = flattened.formErrors[0]
      ?? Object.values(zodFieldErrors(parsed.error))[0]?.[0]
      ?? "Check the submitted fields and try again.";
    return apiError("VALIDATION_FAILED", first, 422, zodFieldErrors(parsed.error));
  }

  try {
    const value = parseMoney(parsed.data.value);
    if (value.paise <= 0) {
      throw new AdminActionError("Coupon value must be greater than zero.");
    }
    if (parsed.data.type === "percentage" && value.paise > 10_000) {
      throw new AdminActionError("Percentage coupons cannot exceed 100%.");
    }
    const values = {
      code: parsed.data.code,
      type: parsed.data.type,
      value: value.decimal,
      minOrderAmount: parseMoney(parsed.data.minOrderAmount).decimal,
      maxDiscount: parsed.data.maxDiscount
        ? parseMoney(parsed.data.maxDiscount).decimal
        : null,
      usageLimit: parsed.data.usageLimit,
      expiresAt: parsed.data.expiresAt,
      isActive: parsed.data.isActive,
      updatedAt: new Date(),
    };

    if (parsed.data.id) {
      const couponId = parsed.data.id;
      const current = await db.query.coupons.findFirst({
        where: (table, { eq: equals }) => equals(table.id, couponId),
        columns: { usedCount: true },
      });
      if (!current) throw new AdminActionError("Coupon not found.");
      if (
        parsed.data.usageLimit !== null &&
        parsed.data.usageLimit < current.usedCount
      ) {
        throw new AdminActionError(
          "Usage limit cannot be below the number already used.",
        );
      }
      await db.update(coupons).set(values).where(eq(coupons.id, couponId));
    } else {
      await db.insert(coupons).values(values);
    }

    await adminEvents.emit(
      domainEvent("coupon.changed", {
        actorId: authorization.admin.id,
        couponId: parsed.data.id ?? null,
        code: parsed.data.code,
        action: "saved",
      }),
    );
    return apiSuccess(null);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return apiError("COUPON_OPERATION_FAILED", error.message, 409);
    }
    console.error("Coupon save failed.", { actorId: authorization.admin.id, error });
    return apiError("INTERNAL_ERROR", "Coupon could not be saved.", 500);
  }
}
