import { z } from "zod";

export const brandNameSchema = z.string()
  .trim()
  .min(1, "Brand name is required.")
  .max(120, "Brand name must be 120 characters or fewer.");

export const brandClientSchema = z.object({
  name: brandNameSchema,
  isActive: z.boolean(),
});

const booleanFormValue = z.enum(["true", "false", "1", "0", "on"]);

export const brandMutationSchema = z.object({
  name: brandNameSchema,
  isActive: booleanFormValue,
  removeLogo: booleanFormValue.optional(),
  logo: z.instanceof(File).optional(),
}).strict();

export const brandIdSchema = z.string().uuid("Brand ID is invalid.");

export const brandStatusSchema = z.object({
  isActive: z.boolean(),
}).strict();

export const brandQuerySchema = z.object({
  q: z.string().trim().max(120).default(""),
  status: z.enum(["all", "active", "inactive"]).default("all"),
}).strict();

export const brandReorderSchema = z.object({
  brandIds: z.array(brandIdSchema).min(1).max(500),
}).strict().superRefine((value, context) => {
  if (new Set(value.brandIds).size !== value.brandIds.length) {
    context.addIssue({
      code: "custom",
      path: ["brandIds"],
      message: "Brand order contains duplicate IDs.",
    });
  }
});

export function normalizeBrandName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
