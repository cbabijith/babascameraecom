"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@babascamera/ui";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

export function SortableHeading({
  label,
  direction,
  onToggle,
}: {
  label: string;
  direction: false | "asc" | "desc";
  onToggle: () => void;
}) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <button type="button" onClick={onToggle} className="inline-flex items-center gap-1 font-medium text-[var(--admin-muted)] hover:text-[var(--admin-text)]">
      {label}<Icon className="size-3.5" />
    </button>
  );
}

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = "Search records…",
  emptyMessage = "No records found.",
  searchable = true,
  paginated = true,
  showRecordCount = true,
}: {
  columns: ColumnDef<TData>[];
  data: TData[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  searchable?: boolean;
  paginated?: boolean;
  showRecordCount?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(paginated ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    initialState: { pagination: { pageIndex: 0, pageSize: 25 } },
  });
  return (
    <div className="grid gap-3">
      {searchable ? <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
        />
      </div> : null}
      <div className="overflow-hidden rounded-lg border border-[var(--admin-border)] bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((group) => (
                <TableRow key={group.id}>
                  {group.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={columns.length} className="h-28 text-center text-slate-500">{emptyMessage}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {showRecordCount || paginated ? <div className="flex items-center justify-between text-sm text-slate-500">
        {showRecordCount ? <span>{table.getFilteredRowModel().rows.length} records</span> : <span />}
        {paginated ? <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next <ChevronRight className="size-4" />
          </Button>
        </div> : null}
      </div> : null}
    </div>
  );
}
