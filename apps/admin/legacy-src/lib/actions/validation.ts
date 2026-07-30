import { z } from "zod";

export const uuidSchema = z.string().uuid("The selected record is invalid.");

export const catalogLookupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Name must contain at least 2 characters.").max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase URL slug."),
  code: z
    .string()
    .trim()
    .min(2)
    .max(32)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, dashes, or underscores."),
  description: z.string().trim().max(2000).nullable(),
  status: z.enum(["draft", "active", "archived"]),
  visibility: z.enum(["visible", "hidden"]),
  position: z.number().int().min(0).max(100000),
  parent_id: z.string().uuid().nullable().optional(),
});

export const productSchema = z.object({
  id: z.string().uuid().optional(),
  brand_id: z.string().uuid("Choose a brand."),
  primary_category_id: z.string().uuid("Choose a category."),
  name: z.string().trim().min(3).max(180),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use a lowercase URL slug."),
  code: z.string().trim().min(2).max(40),
  description: z.string().trim().max(12000).nullable(),
  key_features: z.array(z.string().trim().min(1).max(300)).max(30),
  specifications: z.record(z.string(), z.unknown()),
  measuring_unit: z.string().trim().min(1).max(30),
  payment_eligibility: z.enum(["online", "cod", "both"]),
  status: z.enum(["draft", "active", "archived"]),
  visibility: z.enum(["visible", "hidden"]),
  position: z.number().int().min(0),
  seo_title: z.string().trim().max(70).nullable(),
  seo_description: z.string().trim().max(170).nullable(),
});

export const variantSchema = z
  .object({
    id: z.string().uuid().optional(),
    product_id: z.string().uuid(),
    sku: z.string().trim().min(2).max(80),
    barcode: z.string().trim().max(80).nullable(),
    hsn_code: z.string().trim().max(20).nullable(),
    color: z.string().trim().max(60).nullable(),
    color_label: z.string().trim().max(60).nullable(),
    price_minor: z.number().int().min(0),
    compare_at_minor: z.number().int().min(0).nullable(),
    cost_minor: z.number().int().min(0).nullable(),
    tax_rate_bps: z.number().int().min(0).max(10000),
    tax_mode: z.enum(["inclusive", "exclusive"]),
    weight_grams: z.number().int().positive().nullable(),
    is_default: z.boolean(),
    is_active: z.boolean(),
  })
  .refine(
    (value) =>
      value.compare_at_minor === null || value.compare_at_minor >= value.price_minor,
    {
      message: "Compare-at price cannot be below the selling price.",
      path: ["compare_at_minor"],
    },
  )
  .refine((value) => !value.is_default || value.is_active, {
    message: "The default variant must remain active.",
    path: ["is_active"],
  });

export const bannerSchema = z
  .object({
    id: z.string().uuid().optional(),
    heading: z.string().trim().min(2).max(160),
    subheading: z.string().trim().max(300).nullable(),
    tagline: z.string().trim().max(160).nullable(),
    cta_label: z.string().trim().max(60).nullable(),
    cta_href: z
      .string()
      .trim()
      .max(500)
      .refine(
        (value) => !value || value.startsWith("/") || value.startsWith("https://"),
        "Use a relative path or an HTTPS URL.",
      )
      .nullable(),
    banner_type: z.string().trim().min(2).max(40),
    status: z.enum(["draft", "active", "archived"]),
    visibility: z.enum(["visible", "hidden"]),
    position: z.number().int().min(0),
    starts_at: z.string().datetime().nullable(),
    ends_at: z.string().datetime().nullable(),
  })
  .refine(
    (value) =>
      !value.starts_at || !value.ends_at || new Date(value.ends_at) > new Date(value.starts_at),
    { message: "End time must be after start time.", path: ["ends_at"] },
  );

export const collectionSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(160),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().trim().max(2000).nullable(),
    discount_bps: z.number().int().min(0).max(10000),
    status: z.enum(["draft", "active", "archived"]),
    visibility: z.enum(["visible", "hidden"]),
    position: z.number().int().min(0),
    starts_at: z.string().datetime().nullable(),
    ends_at: z.string().datetime().nullable(),
  })
  .refine(
    (value) =>
      !value.starts_at || !value.ends_at || new Date(value.ends_at) > new Date(value.starts_at),
    { message: "End time must be after start time.", path: ["ends_at"] },
  );

export const couponSchema = z
  .object({
    id: z.string().uuid().optional(),
    code: z.string().trim().min(2).max(40).transform((value) => value.toUpperCase()),
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(1000).nullable(),
    coupon_type: z.enum(["fixed", "percentage", "free_shipping"]),
    value: z.number().int().positive(),
    maximum_discount_minor: z.number().int().min(0).nullable(),
    minimum_subtotal_minor: z.number().int().min(0),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    total_usage_limit: z.number().int().positive().nullable(),
    per_customer_limit: z.number().int().positive().max(100),
    is_active: z.boolean(),
  })
  .refine((value) => new Date(value.ends_at) > new Date(value.starts_at), {
    message: "End time must be after start time.",
    path: ["ends_at"],
  })
  .refine((value) => value.coupon_type !== "percentage" || value.value <= 10000, {
    message: "Percentage cannot exceed 100%.",
    path: ["value"],
  });

export function dateTimeOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function jsonObject(value: string) {
  if (!value.trim()) return {};
  const parsed: unknown = JSON.parse(value);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Specifications must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}
