"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

interface CustomerOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  createdAt: string;
}

const columns: ColumnDef<CustomerOrderRow>[] = [
  {
    accessorKey: "orderNumber",
    header: "Order",
    cell: ({ row }) => (
      <Link href={`/orders/${row.original.id}`} className="font-bold hover:underline">
        {row.original.orderNumber}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment",
    cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />,
  },
  {
    accessorKey: "total",
    header: "Total",
    cell: ({ row }) => formatMoney(row.original.total),
  },
  {
    accessorKey: "createdAt",
    header: "Placed",
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
];

export function CustomerOrderTable({ data }: { data: CustomerOrderRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage="No orders yet."
      searchable={false}
      paginated={false}
      showRecordCount={false}
    />
  );
}
