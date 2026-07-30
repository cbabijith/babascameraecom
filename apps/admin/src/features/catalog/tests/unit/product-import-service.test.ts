import { describe, expect, it } from "bun:test";

import { validateRawProductImportRows } from "@/features/catalog/services/product-import-service";
import type { RawProductImportRow } from "@/features/catalog/schemas/product-import";

const validRow: RawProductImportRow = {
  name: "Canon EOS R50",
  sku: "CANON-R50",
  category: "Cameras",
  brand: "Canon",
  mrp: "72500.00",
  sale_price: "68990.00",
  cost_price: "",
  stock: "8",
  short_description: "",
  description: "",
  youtube_url: "",
  gst_rate: "18",
  price_includes_gst: "yes",
  low_stock_threshold: "2",
  weight: "",
  shipping_fee: "",
  warranty: "",
  meta_title: "",
  meta_description: "",
  active: "true",
  featured: "0",
};

function lookup(overrides?: {
  existingSkus?: string[];
  existingSlugs?: string[];
}) {
  return {
    categoriesByName: new Map([["cameras", { id: "category-1", name: "Cameras" }]]),
    brandsByName: new Map([["canon", { id: "brand-1", name: "Canon" }]]),
    existingSkus: new Set(overrides?.existingSkus ?? []),
    existingSlugs: new Set(overrides?.existingSlugs ?? []),
  };
}

function validate(row: Partial<RawProductImportRow>, rowNumber = 2) {
  return validateRawProductImportRows(
    [{ rowNumber, row: { ...validRow, ...row } }],
    lookup(),
  );
}

describe("product Excel import validation", () => {
  it("requires the core product columns", () => {
    const result = validate({ name: "", sku: "", category: "", mrp: "", sale_price: "", stock: "" });
    expect(result.preview.invalidRows).toBe(1);
    expect(result.preview.errors[0]?.errors).toContain("Name is required.");
    expect(result.preview.errors[0]?.errors).toContain("Category is required.");
    expect(result.preview.errors[0]?.errors).toContain("MRP is required.");
    expect(result.preview.errors[0]?.errors).toContain("Sale price is required.");
    expect(result.preview.errors[0]?.errors).toContain("Stock is required.");
  });

  it("validates money and sale price rules", () => {
    const invalidMoney = validate({ mrp: "bad" });
    expect(invalidMoney.preview.errors[0]?.errors).toContain("MRP must be a valid amount.");
    const overpriced = validate({ sale_price: "80000.00" });
    expect(overpriced.preview.errors[0]?.errors).toContain("Sale price cannot exceed MRP.");
  });

  it("rejects duplicate and existing SKUs", () => {
    const duplicate = validateRawProductImportRows(
      [
        { rowNumber: 2, row: validRow },
        { rowNumber: 3, row: { ...validRow, name: "Canon EOS R50 Kit" } },
      ],
      lookup(),
    );
    expect(duplicate.preview.errors[0]?.errors).toContain("SKU is duplicated in this file.");

    const existing = validateRawProductImportRows(
      [{ rowNumber: 2, row: validRow }],
      lookup({ existingSkus: ["canon-r50"] }),
    );
    expect(existing.preview.errors[0]?.errors).toContain("SKU already exists.");
  });

  it("accepts a blank SKU and generates an internal SKU", () => {
    const result = validate({ sku: "" });
    expect(result.preview.validRows).toBe(1);
    expect(result.validRows[0]?.values.sku).toStartWith("AUTO-CANONEOSR50-");
  });

  it("validates category and brand names", () => {
    expect(validate({ category: "Missing" }).preview.errors[0]?.errors).toContain("Category does not exist.");
    expect(validate({ brand: "Missing" }).preview.errors[0]?.errors).toContain("Brand does not exist.");
  });

  it("validates tax, URL, and boolean values", () => {
    const result = validate({
      gst_rate: "101",
      youtube_url: "ftp://example.test/video",
      active: "maybe",
      featured: "sometimes",
    });
    expect(result.preview.errors[0]?.errors).toContain("GST percentage must be between 0 and 100.");
    expect(result.preview.errors[0]?.errors).toContain("YouTube URL must use HTTP or HTTPS.");
    expect(result.preview.errors[0]?.errors).toContain("Active: Use yes/no, true/false, or 1/0.");
    expect(result.preview.errors[0]?.errors).toContain("Featured: Use yes/no, true/false, or 1/0.");
  });

  it("generates unique slugs from product names", () => {
    const result = validateRawProductImportRows(
      [{ rowNumber: 2, row: validRow }],
      lookup({ existingSlugs: ["canon-eos-r50"] }),
    );
    expect(result.preview.validRows).toBe(1);
    expect(result.validRows[0]?.values.slug).toBe("canon-eos-r50-2");
  });
});
