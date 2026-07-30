import { z } from "zod";

export const productImportHeaders = [
  "name",
  "sku",
  "category",
  "brand",
  "mrp",
  "sale_price",
  "cost_price",
  "stock",
  "short_description",
  "description",
  "youtube_url",
  "gst_rate",
  "price_includes_gst",
  "low_stock_threshold",
  "weight",
  "shipping_fee",
  "warranty",
  "meta_title",
  "meta_description",
  "active",
  "featured",
] as const;

export type ProductImportHeader = (typeof productImportHeaders)[number];

export const requiredProductImportHeaders = [
  "name",
  "category",
  "mrp",
  "sale_price",
  "stock",
] as const satisfies readonly ProductImportHeader[];

export const productImportRowSchema = z.object({
  name: z.string(),
  sku: z.string(),
  category: z.string(),
  brand: z.string(),
  mrp: z.string(),
  sale_price: z.string(),
  cost_price: z.string(),
  stock: z.string(),
  short_description: z.string(),
  description: z.string(),
  youtube_url: z.string(),
  gst_rate: z.string(),
  price_includes_gst: z.string(),
  low_stock_threshold: z.string(),
  weight: z.string(),
  shipping_fee: z.string(),
  warranty: z.string(),
  meta_title: z.string(),
  meta_description: z.string(),
  active: z.string(),
  featured: z.string(),
});

export type RawProductImportRow = z.infer<typeof productImportRowSchema>;
