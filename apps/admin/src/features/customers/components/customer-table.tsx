"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button, toast } from "@babascamera/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { DataTable, SortableHeading } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { adminJson } from "@/lib/api/client";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";

export interface CustomerRow {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  isActive: boolean;
  orderCount: number;
  lifetimeValue: string;
  createdAt: string;
}

export function CustomerStatusButton({
  customer,
}: {
  customer: Pick<CustomerRow, "id" | "email" | "isActive">;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant={customer.isActive ? "destructive" : "default"}
      disabled={pending}
      onClick={() => {
        const nextLabel = customer.isActive ? "disable" : "reactivate";
        if (!window.confirm(`${nextLabel === "disable" ? "Disable" : "Reactivate"} ${customer.email}?`)) return;
        startTransition(async () => {
          const result = await adminJson(
            `/api/admin/customers/${customer.id}/status`,
            {
              method: "PATCH",
              body: { isActive: customer.isActive ? "false" : "true" },
            },
          );
          if (!result.success) {
            toast.error(result.error.message);
            return;
          }
          toast.success(`Customer ${nextLabel === "disable" ? "disabled" : "reactivated"}.`);
          router.refresh();
        });
      }}
    >
      {pending ? "Updating…" : customer.isActive ? "Disable" : "Reactivate"}
    </Button>
  );
}

const columns: ColumnDef<CustomerRow>[] = [
  {
    accessorKey: "fullName",
    header: ({ column }) => <SortableHeading label="Customer" direction={column.getIsSorted()} onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")} />,
    cell: ({ row }) => <div><Link href={`/customers/${row.original.id}`} className="font-bold hover:underline">{row.original.fullName ?? "Unnamed customer"}</Link><p className="text-xs text-slate-500">{row.original.email}</p></div>,
  },
  { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
  { accessorKey: "orderCount", header: "Orders" },
  { accessorKey: "lifetimeValue", header: "Lifetime value", cell: ({ row }) => formatPaise(Number(row.original.lifetimeValue)) },
  { accessorKey: "isActive", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.isActive ? "active" : "inactive"} /> },
  { accessorKey: "createdAt", header: "Joined", cell: ({ row }) => formatDate(row.original.createdAt) },
  {
    id: "actions",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline"><Link href={`/customers/${row.original.id}`}>Open</Link></Button>
        <CustomerStatusButton customer={row.original} />
      </div>
    ),
  },
];

export function CustomerTable({ data }: { data: CustomerRow[] }) {
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => status === "all" ? data : data.filter((item) => item.isActive === (status === "active")), [data, status]);
  return (
    <div className="grid gap-4">
      <div className="flex justify-end"><select className="h-10 rounded-md border bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All customers</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
      <DataTable columns={columns} data={filtered} searchPlaceholder="Search customer, email, or phone…" />
    </div>
  );
}
