import { z } from "zod";

const nullableText = z.string().nullable();
const money = z.string().regex(/^(0|[1-9]\d*)(?:\.\d{1,2})?$/);

export const storefrontHomeQuerySchema = z
  .object({
    sectionLimit: z.coerce.number().int().min(1).max(12).default(8),
  })
  .strict();

export const homeBannerSchema = z
  .object({
    id: z.string().uuid(),
    mediaType: z.enum(["image", "video"]),
    desktopMediaUrl: z.string().min(1),
    mobileMediaUrl: nullableText,
    posterUrl: nullableText,
    altText: z.string().min(1),
    headline: nullableText,
    subheading: nullableText,
    buttonLabel: nullableText,
    destinationUrl: nullableText,
    openInNewTab: z.boolean(),
    position: z.number().int().min(0).max(4),
  })
  .strict();

export const homeCategorySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    slug: z.string().min(1),
    image: nullableText,
    parentId: z.string().uuid().nullable(),
    position: z.number().int().nonnegative(),
  })
  .strict();

export const homeBrandSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    slug: z.string().min(1),
    logo: nullableText,
    position: z.number().int().nonnegative(),
  })
  .strict();

export const homeProductSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    slug: z.string().min(1),
    brand: z
      .object({
        name: z.string().min(1),
        slug: z.string().min(1),
      })
      .strict()
      .nullable(),
    category: z
      .object({
        name: z.string().min(1),
        slug: z.string().min(1),
      })
      .strict(),
    image: z
      .object({
        url: z.string().min(1),
        altText: nullableText,
      })
      .strict()
      .nullable(),
    mrp: money,
    salePrice: money,
    discountPercent: z.number().int().min(0).max(100),
    availability: z.literal("in_stock"),
  })
  .strict();

export const storefrontHomeDataSchema = z
  .object({
    banners: z.array(homeBannerSchema).max(5),
    categories: z.array(homeCategorySchema).max(10),
    brands: z.array(homeBrandSchema).max(16),
    productSections: z
      .object({
        featured: z.array(homeProductSchema).max(12),
        bestSellers: z.array(homeProductSchema).max(12),
        newArrivals: z.array(homeProductSchema).max(12),
        offers: z.array(homeProductSchema).max(12),
      })
      .strict(),
  })
  .strict();

export const storefrontHomeSuccessSchema = z
  .object({
    success: z.literal(true),
    data: storefrontHomeDataSchema,
    meta: z
      .object({
        generatedAt: z.string().datetime(),
        currency: z.literal("INR"),
      })
      .strict(),
  })
  .strict();

export const storefrontApiFailureSchema = z
  .object({
    success: z.literal(false),
    error: z
      .object({
        code: z.string().regex(/^[A-Z0-9_]+$/),
        message: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export const storefrontHomeResponseSchema = z.discriminatedUnion("success", [
  storefrontHomeSuccessSchema,
  storefrontApiFailureSchema,
]);
