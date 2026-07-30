import { describe, expect, test } from "bun:test";
import type { z } from "zod";

import { productClientSchema, slugSchema, wouldCreateCategoryCycle } from "@/features/catalog/schemas/catalog-schemas";

const categoryId = "11111111-1111-4111-8111-111111111111";
const brandId = "22222222-2222-4222-8222-222222222222";

function validProduct(overrides: Partial<z.input<typeof productClientSchema>> = {}) {
  return {
    name: "Canon EOS R50",
    slug: "canon-eos-r50",
    sku: "CAN-R50",
    categoryId,
    brandId,
    shortDescription: "Mirrorless camera kit.",
    description: "<p>Compact camera.</p>",
    mrp: "75000.00",
    salePrice: "69000.00",
    costPrice: "",
    gstRate: "",
    priceIncludesGst: true,
    stock: 12,
    lowStockThreshold: 2,
    weight: "",
    shippingFee: "",
    warranty: "",
    youtubeUrl: "",
    metaTitle: "",
    metaDescription: "",
    isActive: true,
    isFeatured: false,
    variants: [],
    ...overrides,
  };
}

describe("catalog schema rules", () => {
  test("validates catalogue slugs", () => {
    expect(slugSchema.safeParse("canon-cameras-2026").success).toBe(true);
    expect(slugSchema.safeParse("Canon-Cameras").success).toBe(false);
    expect(slugSchema.safeParse("canon cameras").success).toBe(false);
    expect(slugSchema.safeParse("canon--cameras").success).toBe(false);
  });

  test("detects self-parent and ancestor category cycles", () => {
    const cameraId = "33333333-3333-4333-8333-333333333333";
    const dslrId = "44444444-4444-4444-8444-444444444444";
    const fullFrameId = "55555555-5555-4555-8555-555555555555";
    const parentById = new Map<string, string | null>([
      [cameraId, null],
      [dslrId, cameraId],
      [fullFrameId, dslrId],
    ]);

    expect(wouldCreateCategoryCycle({ categoryId: dslrId, parentId: dslrId, parentById })).toBe(true);
    expect(wouldCreateCategoryCycle({ categoryId: dslrId, parentId: fullFrameId, parentById })).toBe(true);
    expect(wouldCreateCategoryCycle({ categoryId: fullFrameId, parentId: cameraId, parentById })).toBe(false);
  });

  test("rejects a sale price greater than MRP", () => {
    const result = productClientSchema.safeParse(validProduct({ mrp: "100.00", salePrice: "101.00" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "salePrice")).toBe(true);
    }
  });

  test("rejects duplicate variant SKUs case-insensitively", () => {
    const result = productClientSchema.safeParse(
      validProduct({
        variants: [
          { name: "Color", value: "Black", sku: "CAN-R50-BLK", additionalPrice: "0.00", stock: 2 },
          { name: "Color", value: "White", sku: "can-r50-blk", additionalPrice: "100.00", stock: 2 },
        ],
      }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "variants")).toBe(true);
    }
  });

  test("accepts products without a brand", () => {
    expect(productClientSchema.safeParse(validProduct({ brandId: "" })).success).toBe(true);
  });

  test("accepts products without a manually entered SKU", () => {
    expect(productClientSchema.safeParse(validProduct({ sku: "" })).success).toBe(true);
  });

  test("rejects GST values above 100 percent", () => {
    const result = productClientSchema.safeParse(validProduct({ gstRate: "101.00" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "gstRate")).toBe(true);
    }
  });

  test("accepts a valid catalogue product payload", () => {
    expect(productClientSchema.safeParse(validProduct()).success).toBe(true);
  });
});
