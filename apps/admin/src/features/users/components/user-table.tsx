"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button, toast } from "@babascamera/ui";
import { ShieldCheck } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { DataTable, SortableHeading } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";

import { promoteUserToAdminAction } from "../server/actions";

export interface UserRow {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: "customer" | "admin";
  isActive: boolean;
  orderCount: number;
  createdAt: string;
}

function PromoteButton({ user }: { user: UserRow }) {
  const [pending, startTransition] = useTransition();
  if (user.role === "admin") {
    return <span className="text-xs font-semibold text-slate-500">Administrator</span>;
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending || !user.isActive}
      title={!user.isActive ? "Reactivate this customer before promotion." : undefined}
      onClick={() => {
        if (!window.confirm(`Promote ${user.email} to administrator? This grants full admin access.`)) {
          return;
        }
        startTransition(async () => {
          const payload = new FormData();
          payload.set("id", user.id);
          const result = await promoteUserToAdminAction(payload);
          if (result.success) toast.success(`${user.email} is now an administrator.`);
          else toast.error(result.error);
        });
      }}
    >
      <ShieldCheck className="size-4" />
      {pending ? "Promoting…" : "Promote to admin"}
    </Button>
  );
}

export function UserTable({ data }: { data: UserRow[] }) {
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(
    () => data.filter((user) => (
      (role === "all" || user.role === role) &&
      (status === "all" || user.isActive === (status === "active"))
    )),
    [data, role, status],
  );
  const columns = useMemo<ColumnDef<UserRow>[]>(() => [
    {
      accessorKey: "fullName",
      header: ({ column }) => (
        <SortableHeading
          label="User"
          direction={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => (
        <div>
          <b>{row.original.fullName ?? "Unnamed user"}</b>
          <p className="text-xs text-slate-500">{row.original.email}</p>
        </div>
      ),
    },
    { accessorKey: "phone", header: "Phone", cell: ({ row }) => row.original.phone ?? "—" },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <StatusBadge status={row.original.role} />,
    },
    {
      accessorKey: "isActive",
      header: "Account",
      cell: ({ row }) => <StatusBadge status={row.original.isActive ? "active" : "inactive"} />,
    },
    { accessorKey: "orderCount", header: "Orders" },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <SortableHeading
          label="Joined"
          direction={column.getIsSorted()}
          onToggle={() => column.toggleSorting(column.getIsSorted() === "asc")}
        />
      ),
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    { id: "actions", cell: ({ row }) => <PromoteButton user={row.original} /> },
  ], []);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        <select
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          <option value="customer">Customers</option>
          <option value="admin">Administrators</option>
        </select>
        <select
          className="h-10 rounded-md border bg-white px-3 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by account status"
        >
          <option value="all">All accounts</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        searchPlaceholder="Search users by name, email, phone, or role…"
      />
    </div>
  );
}
