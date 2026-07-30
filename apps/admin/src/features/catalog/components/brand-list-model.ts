import type { BrandListItem, BrandStatusFilter } from "../types";

export function filterBrands(
  brands: BrandListItem[],
  query: string,
  status: BrandStatusFilter,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return brands.filter((brand) => {
    if (status === "active" && !brand.isActive) return false;
    if (status === "inactive" && brand.isActive) return false;
    return !normalizedQuery || brand.name.toLocaleLowerCase().includes(normalizedQuery);
  });
}

export function brandCounts(brands: BrandListItem[]) {
  const active = brands.filter((brand) => brand.isActive).length;
  return { all: brands.length, active, inactive: brands.length - active };
}

export function reorderBrandsLocally(
  brands: BrandListItem[],
  activeId: string,
  overId: string,
) {
  const ordered = [...brands].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
  const from = ordered.findIndex((brand) => brand.id === activeId);
  const to = ordered.findIndex((brand) => brand.id === overId);
  if (from < 0 || to < 0 || from === to) return brands;
  const [moved] = ordered.splice(from, 1);
  if (!moved) return brands;
  ordered.splice(to, 0, moved);
  return ordered.map((brand, position) => ({ ...brand, position }));
}
