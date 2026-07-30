"use client";

import Link from "next/link";

import { AdminActionMenu } from "@/components/ui/admin-resource";

import type { BrandListItem } from "../types";

const itemClass = "block w-full px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

export function BrandActionsMenu({
  brand,
  disabled,
  onDelete,
  onEdit,
  onToggleActive,
}: {
  brand: BrandListItem;
  disabled: boolean;
  onDelete: (brand: BrandListItem) => void;
  onEdit: (brand: BrandListItem) => void;
  onToggleActive: (brand: BrandListItem) => void;
}) {
  const deleteDisabled = brand.productCount > 0 || disabled;
  return (
    <AdminActionMenu label={`Open actions for ${brand.name}`} disabled={disabled}>
      {(close) => (
        <>
          <button type="button" role="menuitem" className={itemClass} onClick={() => { close(); onEdit(brand); }}>Edit brand</button>
          <button type="button" role="menuitem" className={itemClass} onClick={() => { close(); onToggleActive(brand); }}>
            {brand.isActive ? "Deactivate" : "Activate"}
          </button>
          <Link role="menuitem" href={`/products?brand=${brand.id}`} className={itemClass} onClick={close}>View products</Link>
          <div className="my-1 border-t border-slate-100" />
          <button
            type="button"
            role="menuitem"
            disabled={deleteDisabled}
            title={brand.productCount > 0 ? "Move or remove products before deleting." : "Delete brand"}
            className={`${itemClass} text-rose-700 hover:bg-rose-50 disabled:bg-white disabled:text-slate-400`}
            onClick={() => { close(); onDelete(brand); }}
          >
            Delete brand
          </button>
          {brand.productCount > 0 ? <p className="px-3 pb-2 text-xs text-slate-500">Used by {brand.productCount} product{brand.productCount === 1 ? "" : "s"}.</p> : null}
        </>
      )}
    </AdminActionMenu>
  );
}
