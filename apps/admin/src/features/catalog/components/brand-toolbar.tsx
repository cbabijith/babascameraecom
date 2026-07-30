"use client";

import { Button, Input } from "@babascamera/ui";
import { RotateCcw, Search, X } from "lucide-react";

import { AdminResourceTabs } from "@/components/ui/admin-resource";

import type { BrandStatusFilter } from "../types";

export function BrandToolbar({
  counts,
  disabled,
  onQueryChange,
  onReorder,
  onStatusChange,
  query,
  reorderDisabled,
  status,
}: {
  counts: { all: number; active: number; inactive: number };
  disabled: boolean;
  onQueryChange: (query: string) => void;
  onReorder: () => void;
  onStatusChange: (status: BrandStatusFilter) => void;
  query: string;
  reorderDisabled: boolean;
  status: BrandStatusFilter;
}) {
  return (
    <div className="grid gap-3 p-3">
      <AdminResourceTabs
        disabled={disabled}
        value={status}
        onChange={onStatusChange}
        options={[
          { value: "all", label: "All", count: counts.all },
          { value: "active", label: "Active", count: counts.active },
          { value: "inactive", label: "Inactive", count: counts.inactive },
        ]}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={query}
            disabled={disabled}
            placeholder="Search brands"
            aria-label="Search brands"
            className="h-9 rounded-md pl-9 pr-9"
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query ? (
            <button type="button" aria-label="Clear search" disabled={disabled} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100" onClick={() => onQueryChange("")}>
              <X className="size-4" />
            </button>
          ) : null}
        </label>
        <Button type="button" size="sm" variant="outline" disabled={disabled || reorderDisabled} onClick={onReorder}>
          <RotateCcw className="size-4" /> Reorder brands
        </Button>
      </div>
    </div>
  );
}
