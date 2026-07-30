"use client";

/* eslint-disable @next/next/no-img-element -- Product media uses runtime Supabase public URLs. */

import type { ColumnDef } from "@tanstack/react-table";
import { Button, toast } from "@babascamera/ui";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import { DataTable, SortableHeading } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import {
  bulkDeleteProductsAction,
  bulkSetProductsActiveAction,
  toggleProductAction,
} from "@/lib/actions/catalog";
import { formatMoney } from "@/lib/money";

export interface ProductRow {
  id: string;
  name: string;
  sku: string;
  salePrice: string;
  stock: number;
  threshold: number;
  isActive: boolean;
  isFeatured: boolean;
  category: string;
  brand: string;
  imageUrl: string | null;
  variantCount: number;
}

export function ProductTable({ data }: { data: ProductRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const available = new Set(data.map((item) => item.id));
    setSelected((current) => new Set([...current].filter((id) => available.has(id))));
  }, [data]);
  const filtered = useMemo(
    () => data.filter((item) => (
      (status === "all" || item.isActive === (status === "active")) &&
      (category === "all" || item.category === category) &&
      (brand === "all" || item.brand === brand)
    )),
    [brand, category, data, status],
  );
  const categoryOptions = useMemo(
    () => [...new Set(data.map((item) => item.category))].sort(),
    [data],
  );
  const brandOptions = useMemo(
    () => [...new Set(data.map((item) => item.brand))].sort(),
    [data],
  );
  const columns = useMemo<ColumnDef<ProductRow>[]>(() => [
    {
      id: "select",
      header: () => (
        <input
          type="checkbox"
          aria-label="Select all visible products"
          checked={filtered.length > 0 && filtered.every((item) => selected.has(item.id))}
          onChange={(event) => {
            setSelected((current) => {
              const next = new Set(current);
              for (const item of filtered) {
                if (event.target.checked) next.add(item.id);
                else next.delete(item.id);
              }
              return next;
            });
          }}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.original.name}`}
          checked={selected.has(row.original.id)}
          onChange={(event) => {
            setSelected((current) => {
              const next = new Set(current);
              if (event.target.checked) next.add(row.original.id);
              else next.delete(row.original.id);
              return next;
            });
          }}
        />
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortableHeading
          label="Product"
          direction={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => (
        <div className="flex min-w-64 items-center gap-3">
          {row.original.imageUrl ? (
            <img src={row.original.imageUrl} alt="" className="size-12 rounded-xl object-cover" />
          ) : (
            <span className="size-12 rounded-xl bg-slate-100" />
          )}
          <div>
            <Link href={`/products/${row.original.id}/edit`} className="font-bold hover:underline">
              {row.original.name}
            </Link>
            <p className="text-xs text-slate-500">{row.original.sku}</p>
          </div>
        </div>
      ),
    },
    { accessorKey: "category", header: "Category" },
    { accessorKey: "brand", header: "Brand" },
    {
      accessorKey: "salePrice",
      header: "Price",
      cell: ({ row }) => formatMoney(row.original.salePrice),
    },
    {
      accessorKey: "stock",
      header: ({ column }) => (
        <SortableHeading
          label="Stock"
          direction={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => (
        <span className={row.original.stock <= row.original.threshold ? "font-bold text-rose-600" : ""}>
          {row.original.stock}
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.isActive ? "active" : "inactive"} />,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/products/${row.original.id}/edit`}>Edit</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const payload = new FormData();
                payload.set("id", row.original.id);
                payload.set("isActive", row.original.isActive ? "false" : "true");
                try {
                  const result = await toggleProductAction(payload);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(`Product ${row.original.isActive ? "disabled" : "enabled"}.`);
                } catch (error) {
                  console.error("Product status request failed.", error);
                  toast.error("Product status could not be changed.");
                }
              });
            }}
          >
              {row.original.isActive ? "Disable" : "Enable"}
          </Button>
        </div>
      ),
    },
  ], [filtered, pending, selected]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <select
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">All products</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categoryOptions.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          aria-label="Filter by brand"
        >
          <option value="all">All brands</option>
          {brandOptions.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        {selected.size ? (
          <>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Update ${selected.size} selected products?`)) {
                return;
              }
              startTransition(async () => {
                const payload = new FormData();
                payload.set("productIds", JSON.stringify([...selected]));
                payload.set("isActive", "true");
                try {
                  const result = await bulkSetProductsActiveAction(payload);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  setSelected(new Set());
                  toast.success("Selected products enabled.");
                } catch (error) {
                  console.error("Bulk product update request failed.", error);
                  toast.error("Products could not be updated.");
                }
              });
            }}
          >
            Enable selected
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Disable ${selected.size} selected products?`)) return;
              startTransition(async () => {
                const payload = new FormData();
                payload.set("productIds", JSON.stringify([...selected]));
                payload.set("isActive", "false");
                try {
                  const result = await bulkSetProductsActiveAction(payload);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  setSelected(new Set());
                  toast.success("Selected products disabled.");
                } catch (error) {
                  console.error("Bulk product update request failed.", error);
                  toast.error("Products could not be updated.");
                }
              });
            }}
          >
            Disable selected
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(
                `Permanently delete ${selected.size} selected products? Products with order inventory history will be rejected.`,
              )) {
                return;
              }
              startTransition(async () => {
                const payload = new FormData();
                payload.set("productIds", JSON.stringify([...selected]));
                try {
                  const result = await bulkDeleteProductsAction(payload);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  setSelected(new Set());
                  toast.success("Selected products deleted.");
                } catch (error) {
                  console.error("Bulk product deletion request failed.", error);
                  toast.error("Products could not be deleted.");
                }
              });
            }}
          >
            Delete selected
          </Button>
          </>
        ) : null}
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Search products, SKU, category, or brand…"
      />
    </div>
  );
}
