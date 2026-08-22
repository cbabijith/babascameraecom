"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@babascamera/ui";
import Link from "next/link";
import { useMemo, useState } from "react";

import { DataTable, SortableHeading } from "@/components/data-table";
import { DeleteOrderButton } from "@/components/order-actions";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";

interface OrderRow {
  id: string;
  orderNumber: string;
  customer: string;
  customerEmail: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: string;
  itemCount: number;
  createdAt: string;
}

const columns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: "orderNumber",
    header: ({ column }) => <SortableHeading label="Order" direction={column.getIsSorted()} onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
    cell: ({ row }) => <Link href={`/orders/${row.original.id}`} className="font-black hover:underline">{row.original.orderNumber}</Link>,
  },
  { accessorKey: "customer", header: "Customer", cell: ({ row }) => <div><b>{row.original.customer}</b><p className="text-xs text-slate-500">{row.original.customerEmail}</p></div> },
  { accessorKey: "itemCount", header: "Items" },
  { accessorKey: "total", header: "Total", cell: ({ row }) => formatMoney(row.original.total) },
  { accessorKey: "status", header: "Order status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  { accessorKey: "paymentStatus", header: "Payment", cell: ({ row }) => <div className="grid gap-1"><StatusBadge status={row.original.paymentStatus} /><small className="uppercase text-slate-500">{row.original.paymentMethod}</small></div> },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <SortableHeading label="Placed" direction={column.getIsSorted()} onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
    cell: ({ row }) => formatDate(row.original.createdAt, true),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/orders/${row.original.id}`}>Open</Link>
        </Button>
        <DeleteOrderButton
          orderId={row.original.id}
          orderNumber={row.original.orderNumber}
        />
      </div>
    ),
  },
];

export function OrderTable({ data }: { data: OrderRow[] }) {
  const [status, setStatus] = useState("all");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const filtered = useMemo(() => data.filter((order) => {
    const placedAt = new Date(order.createdAt);
    const startsAt = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const endsAt = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;
    return (
      (status === "all" || order.status === status) &&
      (paymentMethod === "all" || order.paymentMethod === paymentMethod) &&
      (!startsAt || placedAt >= startsAt) &&
      (!endsAt || placedAt <= endsAt)
    );
  }), [data, dateFrom, dateTo, paymentMethod, status]);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm" aria-label="Filter by status">
          <option value="all">All statuses</option>
          {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="h-10 rounded-md border bg-white px-3 text-sm" aria-label="Filter by payment method">
          <option value="all">All payment methods</option>
          <option value="razorpay">Razorpay</option>
          <option value="cod">Cash on delivery</option>
        </select>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          From <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-10 rounded-md border bg-white px-2 text-sm text-slate-900" />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          To <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className="h-10 rounded-md border bg-white px-2 text-sm text-slate-900" />
        </label>
      </div>
      <DataTable columns={columns} data={filtered} searchPlaceholder="Search order, customer, email, or payment…" />
    </div>
  );
}
