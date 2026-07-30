import type { CategoryListItem } from "@/features/catalog/types";

export interface CategoryTreeRow extends CategoryListItem {
  childCount: number;
  depth: number;
  hasChildren: boolean;
  isOrphan: boolean;
  parentPath: string;
}

export interface CategoryFilters {
  query: string;
  status: "all" | "active" | "inactive";
  parentId: "all" | "top" | string;
}

export function buildCategoryLookups(categories: CategoryListItem[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const childrenByParent = new Map<string | null, CategoryListItem[]>();

  for (const category of categories) {
    const parentId = category.parentId && byId.has(category.parentId) ? category.parentId : null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(category);
    childrenByParent.set(parentId, siblings);
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  }

  return { byId, childrenByParent };
}

export function getDescendantIds(categoryId: string, categories: CategoryListItem[]) {
  const { childrenByParent } = buildCategoryLookups(categories);
  const descendants = new Set<string>();
  const visit = (parentId: string) => {
    for (const child of childrenByParent.get(parentId) ?? []) {
      if (descendants.has(child.id)) continue;
      descendants.add(child.id);
      visit(child.id);
    }
  };
  visit(categoryId);
  return descendants;
}

export function getParentPath(category: CategoryListItem, byId: Map<string, CategoryListItem>) {
  const path: string[] = [];
  const seen = new Set<string>([category.id]);
  let cursor = category.parentId;

  while (cursor) {
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const parent = byId.get(cursor);
    if (!parent) break;
    path.unshift(parent.name);
    cursor = parent.parentId;
  }

  return path.join(" / ");
}

export function buildCategoryTreeRows(
  categories: CategoryListItem[],
  expandedIds: Set<string> = new Set<string>(categories.map((category) => category.id)),
) {
  const { byId, childrenByParent } = buildCategoryLookups(categories);
  const rows: CategoryTreeRow[] = [];
  const visited = new Set<string>();

  const visit = (category: CategoryListItem, depth: number, lineage: Set<string>) => {
    if (visited.has(category.id)) return;
    visited.add(category.id);
    const children = childrenByParent.get(category.id) ?? [];
    rows.push({
      ...category,
      childCount: children.length,
      depth,
      hasChildren: children.length > 0,
      isOrphan: Boolean(category.parentId && !byId.has(category.parentId)),
      parentPath: getParentPath(category, byId),
    });
    if (!expandedIds.has(category.id)) return;
    for (const child of children) {
      if (lineage.has(child.id)) continue;
      visit(child, depth + 1, new Set([...lineage, category.id]));
    }
  };

  for (const category of childrenByParent.get(null) ?? []) {
    visit(category, 0, new Set());
  }

  for (const category of categories) {
    if (!visited.has(category.id)) {
      let cursor = category.parentId;
      const lineage = new Set<string>();
      let hiddenByCollapsedAncestor = false;
      while (cursor && !lineage.has(cursor)) {
        if (visited.has(cursor)) {
          hiddenByCollapsedAncestor = true;
          break;
        }
        lineage.add(cursor);
        cursor = byId.get(cursor)?.parentId ?? null;
      }
      if (hiddenByCollapsedAncestor) continue;
      visit(category, 0, new Set());
    }
  }

  return rows;
}

export function filterCategoryRows(categories: CategoryListItem[], filters: CategoryFilters) {
  const query = filters.query.trim().toLowerCase();
  const { byId } = buildCategoryLookups(categories);
  const rows = buildCategoryTreeRows(categories);

  return rows.filter((row) => {
    if (filters.status === "active" && !row.isActive) return false;
    if (filters.status === "inactive" && row.isActive) return false;
    if (filters.parentId === "top" && row.parentId !== null) return false;
    if (filters.parentId !== "all" && filters.parentId !== "top" && row.parentId !== filters.parentId) return false;
    if (!query) return true;
    const parentPath = getParentPath(row, byId).toLowerCase();
    return row.name.toLowerCase().includes(query) || parentPath.includes(query);
  });
}

export function wouldCreateRecursiveParent(
  categoryId: string,
  nextParentId: string | null,
  categories: CategoryListItem[],
) {
  if (!nextParentId) return false;
  if (categoryId === nextParentId) return true;
  return getDescendantIds(categoryId, categories).has(nextParentId);
}

export function reorderCategorySiblings(
  categories: CategoryListItem[],
  activeId: string,
  overId: string,
) {
  const active = categories.find((category) => category.id === activeId);
  const over = categories.find((category) => category.id === overId);
  if (!active || !over) return { ok: false as const, reason: "missing-category" as const };
  if (active.parentId !== over.parentId) return { ok: false as const, reason: "cross-parent" as const };

  const siblings = categories
    .filter((category) => category.parentId === active.parentId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  const oldIndex = siblings.findIndex((category) => category.id === activeId);
  const newIndex = siblings.findIndex((category) => category.id === overId);
  if (oldIndex < 0 || newIndex < 0) return { ok: false as const, reason: "missing-category" as const };

  const reordered = [...siblings];
  const [moved] = reordered.splice(oldIndex, 1);
  if (!moved) return { ok: false as const, reason: "missing-category" as const };
  reordered.splice(newIndex, 0, moved);

  const sortOrders = new Map(reordered.map((category, index) => [category.id, index]));
  return {
    ok: true as const,
    parentId: active.parentId,
    orderedCategoryIds: reordered.map((category) => category.id),
    categories: categories.map((category) => {
      const sortOrder = sortOrders.get(category.id);
      return sortOrder === undefined ? category : { ...category, sortOrder };
    }),
  };
}
