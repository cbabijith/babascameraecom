"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import { formatMoney } from "@/lib/money";

interface OrderItemRow {
  id: string;
  productName: string;
  variantLabel: string | null;
  sku: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

const columns: ColumnDef<OrderItemRow>[] = [
  {
    accessorKey: "productName",
    header: "Item",
    cell: ({ row }) => (
      <div>
        <b>{row.original.productName}</b>
        <p className="text-xs text-slate-500">{row.original.variantLabel ?? row.original.sku}</p>
      </div>
    ),
  },
  { accessorKey: "quantity", header: "Quantity" },
  {
    accessorKey: "unitPrice",
    header: "Unit",
    cell: ({ row }) => formatMoney(row.original.unitPrice),
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => formatMoney(row.original.total),
  },
];

export function OrderItemTable({ data }: { data: OrderItemRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage="No items on this order."
      searchable={false}
      paginated={false}
      showRecordCount={false}
    />
  );
}
