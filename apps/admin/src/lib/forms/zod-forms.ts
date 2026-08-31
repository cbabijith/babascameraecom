import { z } from "zod";

import { parseMoney } from "@/lib/money";

/**
 * Shared Zod primitives for admin FormData parsing. FormData values are
 * always strings; these helpers normalize empty inputs and checkbox states
 * before validation.
 */

export function emptyStringToNull(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  const normalized = value.trim();
  return normalized.length ? normalized : null;
}

export const uuidSchema = z.string().uuid();

export const idSchema = z.object({ id: uuidSchema });

export const formBooleanSchema = z
  .enum(["true", "false", "1", "0", "on", "off"])
  .transform((value) => value === "true" || value === "1" || value === "on");

export const settingMoney = z.string().trim().refine((value) => {
  try {
    parseMoney(value);
    return true;
  } catch {
    return false;
  }
}, "Expected a non-negative numeric(10,2) decimal string.");

export const optionalUuid = z.preprocess(emptyStringToNull, uuidSchema.nullable());
export const nullableText = z.preprocess(emptyStringToNull, z.string().nullable());
export const optionalMoney = z.preprocess(emptyStringToNull, settingMoney.nullable());

export const optionalPositiveInteger = z
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

export const optionalDate = z
  .preprocess(
    (value) => (value === null || value === undefined ? "" : value),
    z.string().trim(),
  )
  .transform((value) => (value === "" ? null : new Date(value)))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), {
    message: "Expiry date is invalid.",
  });
