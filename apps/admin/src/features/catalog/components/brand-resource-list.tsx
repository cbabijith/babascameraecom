"use client";

import { SortableList } from "@/components/sortable-list";

import type { DragEndEvent } from "@dnd-kit/core";
import type { BrandListItem } from "../types";
import { BrandResourceRow } from "./brand-resource-row";

export function BrandResourceList({
  brands,
  disabled,
  pendingIds,
  reorderMode,
  onDelete,
  onDragEnd,
  onEdit,
  onToggleActive,
}: {
  brands: BrandListItem[];
  disabled: boolean;
  pendingIds: Set<string>;
  reorderMode: boolean;
  onDelete: (brand: BrandListItem) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onEdit: (brand: BrandListItem) => void;
  onToggleActive: (brand: BrandListItem) => void;
}) {
  const content = (
    <div>
      <div className="hidden min-h-10 grid-cols-[minmax(0,1fr)_88px_96px_44px] items-center border-t border-slate-200 bg-slate-50 px-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
        <span>Brand</span><span>Products</span><span>Status</span><span className="sr-only">Actions</span>
      </div>
      {brands.map((brand) => (
        <BrandResourceRow
          key={brand.id}
          brand={brand}
          disabled={disabled || pendingIds.has(brand.id)}
          pending={pendingIds.has(brand.id)}
          reorderMode={reorderMode}
          onDelete={onDelete}
          onEdit={onEdit}
          onToggleActive={onToggleActive}
        />
      ))}
    </div>
  );
  return reorderMode ? (
    <SortableList id="catalog-brand-order" itemIds={brands.map((brand) => brand.id)} disabled={disabled} onDragEnd={onDragEnd}>
      {content}
    </SortableList>
  ) : content;
}
