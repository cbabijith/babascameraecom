"use server";

import { db, eq, coupons } from "@babascamera/db";

import {
  actionFailureFromError,
  actionSuccess,
  AdminActionError,
  type AdminActionResult,
  validationFailure,
} from "@/lib/actions/result";
import { requirePermission } from "@/features/auth/server/admin";
import { adminEvents, domainEvent } from "@/lib/events";
import { idSchema } from "@/lib/forms/zod-forms";
import { parseMoney } from "@/lib/money";

import { couponSchema } from "../schemas/coupon-schema";

export async function saveCouponAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requirePermission("promotions");
  try {
    const parsed = couponSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFailure(parsed.error);

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
        actorId: admin.id,
        couponId: parsed.data.id ?? null,
        code: parsed.data.code,
        action: "saved",
      }),
    );
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Coupon could not be saved.",
      "Coupon save failed.",
    );
  }
}

export async function deleteCouponAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const admin = await requirePermission("promotions");
  try {
    const parsed = idSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFailure(parsed.error);

    const [updated] = await db
      .update(coupons)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(coupons.id, parsed.data.id))
      .returning({ id: coupons.id, code: coupons.code });
    if (!updated) throw new AdminActionError("Coupon not found.");

    await adminEvents.emit(
      domainEvent("coupon.changed", {
        actorId: admin.id,
        couponId: updated.id,
        code: updated.code,
        action: "disabled",
      }),
    );
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Coupon could not be disabled.",
      "Coupon disable failed.",
    );
  }
}
