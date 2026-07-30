import {
  buildProductListParams,
  type CatalogOption,
  type NormalizedProductListQuery,
  type ProductInventoryFilter,
  type ProductListStatus,
} from "@/features/catalog/types";

export type ProductFilterView = "main" | "status" | "inventory" | "category" | "brand";

export interface ProductFilterDraft {
  status: ProductListStatus;
  inventory: ProductInventoryFilter;
  category: string;
  brand: string;
}

export interface CategoryFilterRow extends CatalogOption {
  depth: number;
  parentPath: string;
  searchText: string;
}

const productQueryKeys = [
  "q",
  "status",
  "category",
  "brand",
  "inventory",
  "sort",
  "order",
  "page",
  "pageSize",
] as const;

export function createProductFilterDraft(
  applied: NormalizedProductListQuery,
): ProductFilterDraft {
  return {
    status: applied.status,
    inventory: applied.inventory,
    category: applied.category,
    brand: applied.brand,
  };
}

export function clearProductFilterDraft(): ProductFilterDraft {
  return {
    status: "all",
    inventory: "all",
    category: "all",
    brand: "all",
  };
}

export function updateProductFilterDraft<Key extends keyof ProductFilterDraft>(
  draft: ProductFilterDraft,
  key: Key,
  value: ProductFilterDraft[Key],
): ProductFilterDraft {
  return { ...draft, [key]: value };
}

export function applyProductFilterDraft(
  applied: NormalizedProductListQuery,
  draft: ProductFilterDraft,
): NormalizedProductListQuery {
  return {
    ...applied,
    ...draft,
    page: 1,
  };
}

export function countProductFilters(filters: ProductFilterDraft) {
  return [
    filters.status !== "all",
    filters.inventory !== "all",
    filters.category !== "all",
    filters.brand !== "all",
  ].filter(Boolean).length;
}

export function nextProductFilterViewOnEscape(
  view: ProductFilterView,
): ProductFilterView | null {
  return view === "main" ? null : "main";
}

export function buildCategoryFilterRows(
  categories: CatalogOption[],
): CategoryFilterRow[] {
  const childrenByParent = new Map<string | null, CatalogOption[]>();
  const byId = new Map(categories.map((category) => [category.id, category]));

  for (const category of categories) {
    const parentId = category.parentId ?? null;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(category);
    childrenByParent.set(parentId, children);
  }

  for (const children of childrenByParent.values()) {
    children.sort((left, right) =>
      (left.sortOrder ?? 0) - (right.sortOrder ?? 0)
      || left.name.localeCompare(right.name));
  }

  const rows: CategoryFilterRow[] = [];
  const visited = new Set<string>();

  const visit = (
    category: CatalogOption,
    depth: number,
    parentNames: string[],
    ancestors: Set<string>,
  ) => {
    if (visited.has(category.id) || ancestors.has(category.id)) return;
    visited.add(category.id);
    const parentPath = parentNames.join(" / ");
    rows.push({
      ...category,
      depth,
      parentPath,
      searchText: [...parentNames, category.name].join(" ").toLowerCase(),
    });
    const nextAncestors = new Set([...ancestors, category.id]);
    for (const child of childrenByParent.get(category.id) ?? []) {
      visit(child, depth + 1, [...parentNames, category.name], nextAncestors);
    }
  };

  for (const category of childrenByParent.get(null) ?? []) {
    visit(category, 0, [], new Set());
  }

  for (const category of categories) {
    if (visited.has(category.id)) continue;
    const parent = category.parentId ? byId.get(category.parentId) : undefined;
    visit(category, 0, parent ? [parent.name] : [], new Set());
  }

  return rows;
}

export function searchCategoryFilterRows(
  rows: CategoryFilterRow[],
  query: string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return rows;
  return rows.filter((row) => row.searchText.includes(normalized));
}

export function buildProductNavigationParams(
  current: URLSearchParams,
  next: NormalizedProductListQuery,
) {
  const params = new URLSearchParams(current);
  for (const key of productQueryKeys) params.delete(key);
  const productParams = buildProductListParams(next);
  productParams.forEach((value, key) => params.set(key, value));
  return params;
}
