import { z } from "zod";

import {
  formBooleanSchema,
  optionalDate,
  optionalMoney,
  optionalPositiveInteger,
  optionalUuid,
  settingMoney,
} from "@/lib/forms/zod-forms";

export const couponSchema = z.object({
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
export type CouponInput = z.infer<typeof couponSchema>;
