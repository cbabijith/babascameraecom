"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";

interface RecentOrderRow {
  id: string;
  status: string;
  createdAt: string;
}

const columns: ColumnDef<RecentOrderRow>[] = [
  {
    accessorKey: "id",
    header: "Order",
    cell: ({ row }) => (
      <Link className="font-bold hover:underline" href={`/orders/${row.original.id}`}>
        {row.original.id.slice(0, 8)}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "createdAt",
    header: "Placed",
    cell: ({ row }) => formatDate(row.original.createdAt, true),
  },
];

export function RecentOrdersTable({ data }: { data: RecentOrderRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      emptyMessage="No orders in this period."
      searchable={false}
      paginated={false}
      showRecordCount={false}
    />
  );
}
