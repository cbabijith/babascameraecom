"use server";

import {
  and,
  coupons,
  db,
  eq,
  reviews,
  settings,
  users,
  type JsonValue,
} from "@babascamera/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  actionFailureFromError,
  actionSuccess,
  AdminActionError,
  type AdminActionResult,
  validationFailure,
} from "@/lib/actions/result";
import { requirePermission } from "@/lib/auth/admin";
import { parseMoney } from "@/lib/money";

const uuid = z.string().uuid();

const formBooleanSchema = z
  .enum(["true", "false", "1", "0", "on", "off"])
  .transform((value) => value === "true" || value === "1" || value === "on");

const settingMoney = z.string().trim().refine((value) => {
  try {
    parseMoney(value);
    return true;
  } catch {
    return false;
  }
}, "Expected a non-negative numeric(10,2) decimal string.");

function emptyStringToNull(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

const optionalUuid = z.preprocess(emptyStringToNull, uuid.nullable());
const nullableText = z.preprocess(emptyStringToNull, z.string().nullable());
const optionalMoney = z.preprocess(emptyStringToNull, settingMoney.nullable());
const optionalPositiveInteger = z
  .preprocess(
    emptyStringToNull,
    z.union([
      z.null(),
      z
        .string()
        .regex(/^\d+$/, "Usage limit must be a whole number.")
        .refine((value) => Number.isSafeInteger(Number(value)) && Number(value) >= 1, {
          message: "Usage limit must be at least 1.",
        }),
    ]),
  )
  .transform((value) => (value === null ? null : Number(value)));
const optionalDate = z
  .preprocess(
    (value) => (value === null || value === undefined ? "" : value),
    z.string().trim(),
  )
  .transform((value) => (value === "" ? null : new Date(value)))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), {
    message: "Expiry date is invalid.",
  });

const customerStatusSchema = z.object({
  id: uuid,
  isActive: formBooleanSchema,
});
const idSchema = z.object({ id: uuid });
const reviewApprovalSchema = idSchema.extend({ isApproved: formBooleanSchema });
const couponSchema = z.object({
  id: optionalUuid,
  code: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z
      .string()
      .regex(
        /^[A-Z0-9][A-Z0-9_-]{1,39}$/,
        "Coupon code must be 2-40 uppercase letters, numbers, hyphens, or underscores.",
      ),
  ),
  type: z.enum(["percentage", "flat"]),
  value: settingMoney,
  minOrderAmount: settingMoney,
  maxDiscount: optionalMoney,
  usageLimit: optionalPositiveInteger,
  expiresAt: optionalDate,
  isActive: formBooleanSchema,
});

export async function setCustomerActiveAction(
  formData: FormData,
): Promise<AdminActionResult> {
  await requirePermission("customers");
  try {
    const parsed = customerStatusSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFailure(parsed.error);

    const [updated] = await db
      .update(users)
      .set({ isActive: parsed.data.isActive, updatedAt: new Date() })
      .where(and(eq(users.id, parsed.data.id), eq(users.role, "customer")))
      .returning({ id: users.id });
    if (!updated) throw new AdminActionError("Customer not found.");

    revalidatePath("/customers");
    revalidatePath(`/customers/${parsed.data.id}`);
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Customer status could not be changed.",
      "Customer status update failed.",
    );
  }
}

export async function saveCouponAction(
  formData: FormData,
): Promise<AdminActionResult> {
  await requirePermission("promotions");
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

    revalidatePath("/coupons");
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
  await requirePermission("promotions");
  try {
    const parsed = idSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFailure(parsed.error);

    const [updated] = await db
      .update(coupons)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(coupons.id, parsed.data.id))
      .returning({ id: coupons.id });
    if (!updated) throw new AdminActionError("Coupon not found.");

    revalidatePath("/coupons");
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Coupon could not be disabled.",
      "Coupon disable failed.",
    );
  }
}

export async function setReviewApprovalAction(
  formData: FormData,
): Promise<AdminActionResult> {
  await requirePermission("reviews");
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

    revalidatePath("/reviews");
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
  await requirePermission("reviews");
  try {
    const parsed = idSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFailure(parsed.error);

    const [deleted] = await db
      .delete(reviews)
      .where(eq(reviews.id, parsed.data.id))
      .returning({ id: reviews.id });
    if (!deleted) throw new AdminActionError("Review not found.");

    revalidatePath("/reviews");
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Review could not be deleted.",
      "Review deletion failed.",
    );
  }
}

const settingsSchemas = {
  "store.profile": z.object({
    name: z.string().trim().min(1).max(120),
    tagline: z.string().max(240).optional(),
    email: z.string().refine((value) => value === "" || z.string().email().safeParse(value).success),
    phone: z.string().max(40),
    address: z.string().max(500),
  }),
  "shipping.rules": z.object({
    flatCharge: settingMoney,
    freeAbove: settingMoney,
    currency: z.literal("INR"),
  }),
  "cod.rules": z.object({
    enabled: z.boolean(),
    maxOrderAmount: settingMoney,
    pincodeMode: z.enum(["all", "allowlist"]),
    allowedPincodes: z.array(z.string().regex(/^[A-Za-z0-9 -]{3,12}$/)).max(5_000),
  }),
  "seo.defaults": z.object({
    title: z.string().trim().min(1).max(180),
    description: z.string().max(400),
    siteName: z.string().trim().min(1).max(120),
  }),
  "notifications.toggles": z.object({
    orderConfirmation: z.boolean(),
    paymentConfirmation: z.boolean(),
    shippingUpdate: z.boolean(),
    adminNewOrder: z.boolean(),
  }),
  "homepage.hero": z.object({
    eyebrow: z.string().max(100),
    title: z.string().trim().min(1).max(180),
    description: z.string().max(500),
    ctaLabel: z.string().max(80),
    ctaHref: z.string().regex(/^\/(?!\/)/),
    imageUrl: z
      .string()
      .refine((value) => value === "" || /^\/(?!\/)/.test(value) || /^https?:\/\//.test(value))
      .optional(),
    secondaryLabel: z.string().max(80).optional(),
    secondaryHref: z
      .string()
      .refine((value) => value === "" || /^\/(?!\/)/.test(value))
      .optional(),
  }),
} as const;

type SettingKey = keyof typeof settingsSchemas;
const settingGroups: Record<SettingKey, string> = {
  "store.profile": "store",
  "shipping.rules": "checkout",
  "cod.rules": "checkout",
  "seo.defaults": "seo",
  "notifications.toggles": "notifications",
  "homepage.hero": "content",
};

function parseJson(value: string, key: SettingKey): JsonValue {
  let json: unknown;
  try {
    json = JSON.parse(value);
  } catch {
    throw new AdminActionError(
      `Value for ${key} is invalid. Check the documented object fields and JSON types.`,
    );
  }
  const parsed = settingsSchemas[key].safeParse(json);
  if (!parsed.success) {
    throw new AdminActionError(
      `Value for ${key} is invalid. Check the documented object fields and JSON types.`,
    );
  }
  return parsed.data as JsonValue;
}

const saveSettingSchema = z.object({
  key: z.enum([
    "store.profile",
    "shipping.rules",
    "cod.rules",
    "seo.defaults",
    "notifications.toggles",
    "homepage.hero",
  ]),
  label: nullableText,
  value: z.string(),
});

export async function saveSettingAction(
  formData: FormData,
): Promise<AdminActionResult> {
  await requirePermission("settings");
  try {
    const parsed = saveSettingSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFailure(parsed.error);

    const values = {
      key: parsed.data.key,
      label: parsed.data.label,
      group: settingGroups[parsed.data.key],
      value: parseJson(parsed.data.value, parsed.data.key),
      updatedAt: new Date(),
    };
    await db
      .insert(settings)
      .values(values)
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          label: values.label,
          group: values.group,
          value: values.value,
          updatedAt: values.updatedAt,
        },
      });

    revalidatePath("/settings");
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Settings could not be saved.",
      "Settings save failed.",
    );
  }
}

export async function deleteSettingAction(
  formData: FormData,
): Promise<AdminActionResult> {
  await requirePermission("settings");
  try {
    const parsed = idSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return validationFailure(parsed.error);

    const [deleted] = await db
      .delete(settings)
      .where(eq(settings.id, parsed.data.id))
      .returning({ id: settings.id });
    if (!deleted) throw new AdminActionError("Setting not found.");

    revalidatePath("/settings");
    return actionSuccess(null);
  } catch (error) {
    return actionFailureFromError(
      error,
      "Setting could not be deleted.",
      "Setting deletion failed.",
    );
  }
}
