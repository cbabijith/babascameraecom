"use client";

/* eslint-disable @next/next/no-img-element -- Brand logos are administrator-managed runtime URLs. */

import { cn } from "@babascamera/ui";
import { GripVertical, ImageIcon } from "lucide-react";
import { memo, useState } from "react";

import { SortableDragHandle, SortableListItem } from "@/components/sortable-list";
import { AdminStatusBadge } from "@/components/ui/admin-resource";

import type { BrandListItem } from "../types";
import { BrandActionsMenu } from "./brand-actions-menu";
import { resolveMediaUrl } from "@/lib/media-proxy";

export const BrandResourceRow = memo(function BrandResourceRow({
  brand,
  disabled,
  pending,
  reorderMode,
  onDelete,
  onEdit,
  onToggleActive,
}: {
  brand: BrandListItem;
  disabled: boolean;
  pending: boolean;
  reorderMode: boolean;
  onDelete: (brand: BrandListItem) => void;
  onEdit: (brand: BrandListItem) => void;
  onToggleActive: (brand: BrandListItem) => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const content = (
    <div className={cn(
      "grid min-h-14 grid-cols-1 items-center gap-2 border-t border-slate-100 px-3 py-2 transition-colors duration-150 hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_88px_96px_44px] sm:gap-3",
      pending && "bg-slate-50/70",
    )}>
      <div className="flex min-w-0 items-center gap-2">
        {reorderMode ? (
          <SortableDragHandle label={`Reorder ${brand.name}`} disabled={disabled} className="size-10 text-slate-500" />
        ) : <span className="grid size-10 shrink-0 place-items-center text-slate-300" aria-hidden="true"><GripVertical className="size-4" /></span>}
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-slate-400">
          {brand.logoUrl && !logoFailed ? (
            <img src={resolveMediaUrl(brand.logoUrl)} alt={`${brand.name} logo`} className="h-full w-full object-contain p-1" onError={() => setLogoFailed(true)} />
          ) : <ImageIcon className="size-4" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">{brand.name}</span>
          <span className="block text-xs text-slate-500 sm:hidden">{brand.productCount} product{brand.productCount === 1 ? "" : "s"}</span>
        </span>
      </div>
      <span className="hidden text-sm tabular-nums text-slate-600 sm:block">{brand.productCount}</span>
      <span className="hidden sm:block"><AdminStatusBadge active={brand.isActive} /></span>
      <div className="flex items-center justify-between gap-2 pl-12 sm:justify-end sm:pl-0">
        <span className="sm:hidden"><AdminStatusBadge active={brand.isActive} /></span>
        {reorderMode ? null : (
          <BrandActionsMenu brand={brand} disabled={disabled} onDelete={onDelete} onEdit={onEdit} onToggleActive={onToggleActive} />
        )}
      </div>
    </div>
  );
  return reorderMode ? (
    <SortableListItem id={brand.id} disabled={disabled} draggingClassName="relative z-10 bg-white opacity-90 shadow-sm">
      {content}
    </SortableListItem>
  ) : content;
});
