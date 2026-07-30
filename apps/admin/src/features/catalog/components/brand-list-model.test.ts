import { describe, expect, test } from "bun:test";

import type { BrandListItem } from "../types";
import { brandCounts, filterBrands, reorderBrandsLocally } from "./brand-list-model";

const brands: BrandListItem[] = [
  { id: "canon", name: "Canon", slug: "canon", description: null, logoUrl: null, position: 0, isActive: true, productCount: 3 },
  { id: "sony", name: "Sony", slug: "sony", description: null, logoUrl: null, position: 1, isActive: false, productCount: 0 },
  { id: "nikon", name: "Nikon", slug: "nikon", description: null, logoUrl: null, position: 2, isActive: true, productCount: 1 },
];

describe("brand resource-list model", () => {
  test("filters by name and status without mutating the input", () => {
    expect(filterBrands(brands, "CAN", "all").map((brand) => brand.id)).toEqual(["canon"]);
    expect(filterBrands(brands, "", "inactive").map((brand) => brand.id)).toEqual(["sony"]);
    expect(brands.map((brand) => brand.id)).toEqual(["canon", "sony", "nikon"]);
  });

  test("counts all views", () => {
    expect(brandCounts(brands)).toEqual({ all: 3, active: 2, inactive: 1 });
  });

  test("reorders all brands in one stable local model", () => {
    const reordered = reorderBrandsLocally(brands, "nikon", "canon");
    expect(reordered.map((brand) => brand.id)).toEqual(["nikon", "canon", "sony"]);
    expect(reordered.map((brand) => brand.position)).toEqual([0, 1, 2]);
  });

  test("keeps the previous array for stale drag IDs", () => {
    expect(reorderBrandsLocally(brands, "missing", "sony")).toBe(brands);
  });
});
