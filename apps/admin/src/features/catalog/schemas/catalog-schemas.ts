import { z } from "zod";

import { parseMoney } from "@/lib/money";

export const uuidSchema = z.string().uuid();
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const moneyPattern = /^\d+(?:\.\d{1,2})?$/;
const urlPattern = /^https?:\/\//;

export const slugSchema = z
  .string()
  .trim()
  .regex(slugPattern, "Slug must contain lowercase letters, numbers, and hyphens.");

export const lookupClientSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema.optional(),
  description: z.string().max(1_000).optional(),
  imageUrl: z.string().refine((value) => value === "" || /^https?:\/\//.test(value), "Enter an HTTP or HTTPS URL.").optional(),
  parentId: z.string().optional(),
  isActive: z.boolean(),
});

export { brandClientSchema } from "./brand";

export const variantClientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  value: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  additionalPrice: z.string().regex(moneyPattern),
  stock: z.number().int().nonnegative(),
});

export const productClientSchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: slugSchema,
  sku: z.string().trim().max(120),
  categoryId: z.string().uuid(),
  brandId: z.union([z.string().uuid(), z.literal("")]),
  shortDescription: z.string().max(400),
  description: z.string().max(50_000),
  mrp: z.string().regex(moneyPattern),
  salePrice: z.string().regex(moneyPattern),
  costPrice: z.string().refine((value) => value === "" || moneyPattern.test(value)).optional(),
  gstRate: z.string().refine((value) => value === "" || moneyPattern.test(value), "Enter a valid GST percentage."),
  priceIncludesGst: z.boolean(),
  stock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative(),
  weight: z.string().refine((value) => value === "" || moneyPattern.test(value)),
  shippingFee: z.string().refine((value) => value === "" || moneyPattern.test(value)),
  warranty: z.string().max(500),
  youtubeUrl: z.string().refine((value) => value === "" || urlPattern.test(value), "Enter an HTTP or HTTPS URL."),
  metaTitle: z.string().max(180),
  metaDescription: z.string().max(400),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  variants: z.array(variantClientSchema).max(100),
}).superRefine((value, context) => {
  if (parseMoney(value.salePrice).paise > parseMoney(value.mrp).paise) {
    context.addIssue({
      code: "custom",
      message: "Sale price cannot exceed MRP.",
      path: ["salePrice"],
    });
  }
  if (value.gstRate && Number(value.gstRate) > 100) {
    context.addIssue({
      code: "custom",
      message: "GST cannot exceed 100%.",
      path: ["gstRate"],
    });
  }
  const normalizedSkus = value.variants.map((variant) => variant.sku.toLowerCase());
  if (new Set(normalizedSkus).size !== normalizedSkus.length) {
    context.addIssue({
      code: "custom",
      message: "Variant SKUs must be unique.",
      path: ["variants"],
    });
  }
});

export function wouldCreateCategoryCycle(input: {
  categoryId: string;
  parentId: string | null;
  parentById: Map<string, string | null>;
}) {
  let cursor = input.parentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === input.categoryId) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    cursor = input.parentById.get(cursor) ?? null;
  }
  return false;
}
