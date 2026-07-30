import { describe, expect, test } from "bun:test";

import { normalizeProductListQuery } from "@/features/catalog/types";
import {
  applyProductFilterDraft,
  buildCategoryFilterRows,
  buildProductNavigationParams,
  clearProductFilterDraft,
  countProductFilters,
  createProductFilterDraft,
  nextProductFilterViewOnEscape,
  searchCategoryFilterRows,
  updateProductFilterDraft,
} from "./product-filter-model";

describe("product filter draft model", () => {
  const applied = normalizeProductListQuery({
    q: "camera",
    category: "tripod-id",
    page: 4,
    pageSize: 50,
  });

  test("keeps draft changes separate from applied filters", () => {
    const draft = createProductFilterDraft(applied);
    const changed = updateProductFilterDraft(draft, "brand", "canon-id");
    expect(applied.brand).toBe("all");
    expect(changed.brand).toBe("canon-id");
  });

  test("supports category, brand, and explicit no-brand selection", () => {
    const draft = clearProductFilterDraft();
    const categorySelected = updateProductFilterDraft(draft, "category", "tripod-id");
    const brandSelected = updateProductFilterDraft(categorySelected, "brand", "canon-id");
    const noBrandSelected = updateProductFilterDraft(brandSelected, "brand", "none");
    expect(categorySelected.category).toBe("tripod-id");
    expect(brandSelected.brand).toBe("canon-id");
    expect(noBrandSelected.brand).toBe("none");
  });

  test("applies draft values and resets pagination", () => {
    const next = applyProductFilterDraft(applied, {
      status: "active",
      inventory: "in-stock",
      category: "tripod-id",
      brand: "canon-id",
    });
    expect(next).toMatchObject({
      q: "camera",
      status: "active",
      inventory: "in-stock",
      category: "tripod-id",
      brand: "canon-id",
      page: 1,
      pageSize: 50,
    });
  });

  test("cancel is represented by recreating the draft from applied values", () => {
    const changed = updateProductFilterDraft(
      createProductFilterDraft(applied),
      "brand",
      "canon-id",
    );
    expect(changed.brand).toBe("canon-id");
    expect(createProductFilterDraft(applied).brand).toBe("all");
  });

  test("clear all resets only filter values", () => {
    expect(clearProductFilterDraft()).toEqual({
      status: "all",
      inventory: "all",
      category: "all",
      brand: "all",
    });
  });

  test("counts category, brand, no-brand, status, and inventory filters", () => {
    expect(countProductFilters({
      status: "inactive",
      inventory: "low-stock",
      category: "tripod-id",
      brand: "none",
    })).toBe(4);
    expect(countProductFilters(clearProductFilterDraft())).toBe(0);
  });

  test("builds the URL once with pagination reset and unrelated params preserved", () => {
    const params = buildProductNavigationParams(
      new URLSearchParams("page=8&source=admin"),
      applyProductFilterDraft(applied, {
        status: "all",
        inventory: "all",
        category: "tripod-id",
        brand: "none",
      }),
    );
    expect(params.get("category")).toBe("tripod-id");
    expect(params.get("brand")).toBe("none");
    expect(params.get("page")).toBeNull();
    expect(params.get("source")).toBe("admin");
  });

  test("preserves category hierarchy and searches parent paths", () => {
    const rows = buildCategoryFilterRows([
      { id: "camera", name: "Cameras", isActive: true, parentId: null, sortOrder: 1 },
      { id: "mirrorless", name: "Mirrorless", isActive: true, parentId: "camera", sortOrder: 2 },
      { id: "dslr", name: "DSLR", isActive: false, parentId: "camera", sortOrder: 1 },
      { id: "tripod", name: "Tripod", isActive: true, parentId: null, sortOrder: 2 },
    ]);
    expect(rows.map((row) => [row.name, row.depth])).toEqual([
      ["Cameras", 0],
      ["DSLR", 1],
      ["Mirrorless", 1],
      ["Tripod", 0],
    ]);
    expect(searchCategoryFilterRows(rows, "cameras mirrorless")[0]?.id).toBe("mirrorless");
  });

  test("escape returns to main before closing the filter workflow", () => {
    expect(nextProductFilterViewOnEscape("category")).toBe("main");
    expect(nextProductFilterViewOnEscape("brand")).toBe("main");
    expect(nextProductFilterViewOnEscape("main")).toBeNull();
  });
});
