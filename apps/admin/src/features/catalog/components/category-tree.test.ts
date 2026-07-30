import { describe, expect, test } from "bun:test";

import {
  buildCategoryTreeRows,
  filterCategoryRows,
  reorderCategorySiblings,
  wouldCreateRecursiveParent,
} from "@/features/catalog/components/category-tree";
import type { CategoryListItem } from "@/features/catalog/types";

function category(input: Partial<CategoryListItem> & Pick<CategoryListItem, "id" | "name">): CategoryListItem {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug ?? input.name.toLowerCase(),
    description: input.description ?? null,
    imageUrl: input.imageUrl ?? null,
    parentId: input.parentId ?? null,
    parentName: input.parentName ?? null,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive ?? true,
    productCount: input.productCount ?? 0,
  };
}

const sampleCategories = [
  category({ id: "cameras", name: "Cameras", sortOrder: 1 }),
  category({ id: "lenses", name: "Lenses", sortOrder: 0 }),
  category({ id: "mirrorless", name: "Mirrorless", parentId: "cameras", parentName: "Cameras", sortOrder: 1 }),
  category({ id: "dslr", name: "DSLR", parentId: "cameras", parentName: "Cameras", sortOrder: 0, isActive: false }),
  category({ id: "orphan", name: "Orphan", parentId: "missing", sortOrder: 0 }),
];

describe("category resource tree", () => {
  test("builds tree rows with parent and child ordering", () => {
    const rows = buildCategoryTreeRows(sampleCategories);

    expect(rows.map((row) => row.id)).toEqual(["lenses", "orphan", "cameras", "dslr", "mirrorless"]);
    expect(rows.find((row) => row.id === "dslr")?.depth).toBe(1);
    expect(rows.find((row) => row.id === "cameras")?.childCount).toBe(2);
  });

  test("keeps orphaned categories visible safely", () => {
    const orphan = buildCategoryTreeRows(sampleCategories).find((row) => row.id === "orphan");

    expect(orphan?.depth).toBe(0);
    expect(orphan?.isOrphan).toBe(true);
  });

  test("does not reveal child categories until their parent is expanded", () => {
    const collapsed = buildCategoryTreeRows(sampleCategories, new Set());
    expect(collapsed.map((row) => row.id)).toEqual(["lenses", "orphan", "cameras"]);

    const expanded = buildCategoryTreeRows(sampleCategories, new Set(["cameras"]));
    expect(expanded.map((row) => row.id)).toEqual(["lenses", "orphan", "cameras", "dslr", "mirrorless"]);
  });

  test("prevents recursive parent selection", () => {
    expect(wouldCreateRecursiveParent("cameras", "mirrorless", sampleCategories)).toBe(true);
    expect(wouldCreateRecursiveParent("cameras", "cameras", sampleCategories)).toBe(true);
    expect(wouldCreateRecursiveParent("mirrorless", "lenses", sampleCategories)).toBe(false);
  });

  test("searches by category name and parent context", () => {
    expect(filterCategoryRows(sampleCategories, { query: "mirror", status: "all", parentId: "all" }).map((row) => row.id)).toEqual(["mirrorless"]);
    expect(filterCategoryRows(sampleCategories, { query: "cameras", status: "all", parentId: "all" }).map((row) => row.id)).toEqual(["cameras", "dslr", "mirrorless"]);
  });

  test("filters by active status", () => {
    expect(filterCategoryRows(sampleCategories, { query: "", status: "inactive", parentId: "all" }).map((row) => row.id)).toEqual(["dslr"]);
  });

  test("reorders siblings without changing parent hierarchy", () => {
    const result = reorderCategorySiblings(sampleCategories, "mirrorless", "dslr");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.parentId).toBe("cameras");
      expect(result.orderedCategoryIds).toEqual(["mirrorless", "dslr"]);
      expect(result.categories.find((item) => item.id === "mirrorless")?.parentId).toBe("cameras");
      expect(result.categories.find((item) => item.id === "mirrorless")?.sortOrder).toBe(0);
    }
  });

  test("rejects cross-parent reorder", () => {
    const result = reorderCategorySiblings(sampleCategories, "mirrorless", "lenses");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("cross-parent");
  });

  test("supports optimistic rollback by keeping previous immutable input", () => {
    const previous = sampleCategories;
    const result = reorderCategorySiblings(previous, "mirrorless", "dslr");

    expect(result.ok).toBe(true);
    expect(previous.find((item) => item.id === "mirrorless")?.sortOrder).toBe(1);
  });
});
