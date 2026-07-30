"use client";

import { AdminConfirmDialog } from "@/components/ui/admin-resource";

import type { BrandListItem } from "../types";

export function BrandDeleteDialog({
  brand,
  onCancel,
  onConfirm,
  pending,
}: {
  brand: BrandListItem | null;
  onCancel: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <AdminConfirmDialog
      open={Boolean(brand)}
      title="Delete brand?"
      description={brand ? `This will permanently delete "${brand.name}" and its managed logo. This action cannot be undone.` : ""}
      confirmLabel="Delete brand"
      onCancel={onCancel}
      onConfirm={onConfirm}
      pending={pending}
    />
  );
}
