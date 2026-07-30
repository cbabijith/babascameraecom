"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from "@babascamera/ui";
import type { DragEndEvent } from "@dnd-kit/core";
import { Plus, Search, Tags } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  AdminResourceEmptyState,
  AdminResourceSurface,
} from "@/components/ui/admin-resource";
import { AdminPageHeader } from "@/components/ui/admin-page";

import { brandsApi } from "../api/brands-api-client";
import type { BrandListItem, BrandStatusFilter } from "../types";
import { BrandDeleteDialog } from "./brand-delete-dialog";
import { BrandForm } from "./brand-form";
import { brandCounts, filterBrands, reorderBrandsLocally } from "./brand-list-model";
import { BrandReorderToolbar } from "./brand-reorder-toolbar";
import { BrandResourceList } from "./brand-resource-list";
import { BrandToolbar } from "./brand-toolbar";

function statusFromUrl(value: string | null): BrandStatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

export function BrandManager({ brands }: { brands: BrandListItem[] }) {
  const searchParams = useSearchParams();
  const [localBrands, setLocalBrands] = useState(brands);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<BrandStatusFilter>(() => statusFromUrl(searchParams.get("status")));
  const [editing, setEditing] = useState<BrandListItem | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<BrandListItem | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [reorderMode, setReorderMode] = useState(false);
  const [orderSnapshot, setOrderSnapshot] = useState<BrandListItem[] | null>(null);
  const [isSavingOrder, startSavingOrder] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (reorderMode) return;
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status !== "all") params.set("status", status);
      window.history.replaceState(null, "", params.size ? `/brands?${params}` : "/brands");
    }, 240);
    return () => window.clearTimeout(timeout);
  }, [query, reorderMode, status]);

  const ordered = useMemo(
    () => [...localBrands].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    [localBrands],
  );
  const visibleBrands = useMemo(
    () => filterBrands(ordered, deferredQuery, status),
    [deferredQuery, ordered, status],
  );
  const counts = useMemo(() => brandCounts(localBrands), [localBrands]);
  const hasFilters = query.trim() !== "" || status !== "all";
  const busy = isSavingOrder || isDeleting;

  const upsert = useCallback((brand: BrandListItem) => {
    setLocalBrands((current) => {
      const exists = current.some((item) => item.id === brand.id);
      return exists
        ? current.map((item) => item.id === brand.id ? brand : item)
        : [...current, brand];
    });
    setEditing(undefined);
  }, []);

  const toggleActive = useCallback(async (brand: BrandListItem) => {
    if (pendingIds.has(brand.id)) return;
    const previous = brand;
    const optimistic = { ...brand, isActive: !brand.isActive };
    setPendingIds((current) => new Set(current).add(brand.id));
    setLocalBrands((current) => current.map((item) => item.id === brand.id ? optimistic : item));
    const result = await brandsApi.setStatus(brand.id, optimistic.isActive);
    setPendingIds((current) => {
      const next = new Set(current);
      next.delete(brand.id);
      return next;
    });
    if (!result.success) {
      setLocalBrands((current) => current.map((item) => item.id === brand.id ? previous : item));
      toast.error(result.error);
      return;
    }
    setLocalBrands((current) => current.map((item) => item.id === brand.id ? result.data : item));
    toast.success(result.data.isActive ? "Brand activated." : "Brand deactivated.");
  }, [pendingIds]);

  const startReorderMode = () => {
    setOrderSnapshot(ordered);
    setReorderMode(true);
  };
  const cancelReorder = () => {
    if (orderSnapshot) setLocalBrands(orderSnapshot);
    setOrderSnapshot(null);
    setReorderMode(false);
  };
  const finishReorder = () => {
    const previous = orderSnapshot;
    startSavingOrder(async () => {
      const result = await brandsApi.reorder(ordered.map((brand) => brand.id));
      if (!result.success) {
        if (previous) setLocalBrands(previous);
        toast.error(result.error);
        return;
      }
      setOrderSnapshot(null);
      setReorderMode(false);
      toast.success("Brand order saved.");
    });
  };
  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    setLocalBrands((current) => reorderBrandsLocally(current, String(event.active.id), String(event.over?.id)));
  };

  const confirmDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startDeleting(async () => {
      const result = await brandsApi.remove(target.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setLocalBrands((current) => current
        .filter((brand) => brand.id !== target.id)
        .sort((a, b) => a.position - b.position)
        .map((brand, position) => ({ ...brand, position })));
      setDeleting(null);
      toast.success("Brand deleted.");
    });
  };

  return (
    <section className="grid w-full min-w-0 gap-4">
      <AdminPageHeader
        title="Brands"
        description="Manage product manufacturers and brand ordering."
        secondaryActions={
          <Button type="button" size="sm" disabled={reorderMode} onClick={() => setEditing(null)}>
            <Plus className="size-4" /> Add brand
          </Button>
        }
      />

      <AdminResourceSurface>
        {reorderMode ? (
          <BrandReorderToolbar saving={isSavingOrder} onCancel={cancelReorder} onDone={finishReorder} />
        ) : (
          <BrandToolbar
            counts={counts}
            disabled={busy}
            query={query}
            status={status}
            onQueryChange={setQuery}
            onStatusChange={setStatus}
            onReorder={startReorderMode}
            reorderDisabled={hasFilters || localBrands.length < 2}
          />
        )}

        {localBrands.length === 0 ? (
          <AdminResourceEmptyState
            icon={<Tags className="size-8" />}
            title="Add your first brand"
            description="Create manufacturers before assigning them to products."
            action={<Button type="button" size="sm" onClick={() => setEditing(null)}><Plus className="size-4" /> Add brand</Button>}
          />
        ) : visibleBrands.length === 0 ? (
          <AdminResourceEmptyState
            icon={<Search className="size-7" />}
            title="No brands found"
            description="Adjust your search or selected status."
            action={<Button type="button" size="sm" variant="outline" onClick={() => { setQuery(""); setStatus("all"); }}>Clear filters</Button>}
          />
        ) : (
          <BrandResourceList
            brands={reorderMode ? ordered : visibleBrands}
            disabled={busy}
            pendingIds={pendingIds}
            reorderMode={reorderMode}
            onDelete={setDeleting}
            onDragEnd={handleDragEnd}
            onEdit={setEditing}
            onToggleActive={toggleActive}
          />
        )}

        {localBrands.length > 0 && visibleBrands.length > 0 ? (
          <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
            Showing {visibleBrands.length} brand{visibleBrands.length === 1 ? "" : "s"}
          </div>
        ) : null}
      </AdminResourceSurface>

      <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open) setEditing(undefined); }}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit brand" : "Add brand"}</DialogTitle>
            <DialogDescription>Set the brand name, logo, and storefront availability.</DialogDescription>
          </DialogHeader>
          {editing !== undefined ? (
            <BrandForm
              key={editing?.id ?? "new"}
              brand={editing}
              onCancel={() => setEditing(undefined)}
              onSaved={upsert}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <BrandDeleteDialog
        brand={deleting}
        pending={isDeleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
