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
  name: z.string().trim().min(2, "Product name must be at least 2 characters.").max(180, "Product name must be 180 characters or fewer."),
  slug: slugSchema,
  sku: z.string().trim().max(120, "SKU must be 120 characters or fewer."),
  categoryId: z.string().min(1, "Please select a category.").uuid("Please select a valid category."),
  brandId: z.union([z.string().uuid("Invalid brand ID."), z.literal("")]),
  shortDescription: z.string().max(400, "Short description must be 400 characters or fewer."),
  description: z.string().max(50_000, "Description must be 50,000 characters or fewer."),
  mrp: z.string().regex(moneyPattern, "MRP must be a valid non-negative decimal (e.g. 999.00)."),
  salePrice: z.string().regex(moneyPattern, "Sale price must be a valid non-negative decimal (e.g. 999.00)."),
  costPrice: z.string().refine((value) => value === "" || moneyPattern.test(value), "Cost price must be a valid non-negative decimal.").optional(),
  gstRate: z.string().refine((value) => value === "" || moneyPattern.test(value), "Enter a valid GST percentage."),
  priceIncludesGst: z.boolean(),
  stock: z.number().int("Stock must be a whole number.").nonnegative("Stock cannot be negative."),
  lowStockThreshold: z.number().int("Low stock threshold must be a whole number.").nonnegative("Threshold cannot be negative."),
  weight: z.string().refine((value) => value === "" || moneyPattern.test(value), "Weight must be a valid decimal."),
  shippingFee: z.string().refine((value) => value === "" || moneyPattern.test(value), "Shipping fee must be a valid decimal."),
  warranty: z.string().max(500, "Warranty description must be 500 characters or fewer."),
  youtubeUrl: z.string().refine((value) => value === "" || urlPattern.test(value), "Enter an HTTP or HTTPS URL."),
  metaTitle: z.string().max(180, "Meta title must be 180 characters or fewer."),
  metaDescription: z.string().max(400, "Meta description must be 400 characters or fewer."),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  variants: z.array(variantClientSchema).max(100),
}).superRefine((value, context) => {
  if (moneyPattern.test(value.mrp) && moneyPattern.test(value.salePrice)) {
    try {
      if (parseMoney(value.salePrice).paise > parseMoney(value.mrp).paise) {
        context.addIssue({
          code: "custom",
          message: "Sale price cannot exceed MRP.",
          path: ["salePrice"],
        });
      }
    } catch {
      // Prevent unhandled money parsing errors during validation
    }
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
