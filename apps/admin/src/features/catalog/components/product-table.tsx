"use client";

/* eslint-disable @next/next/no-img-element -- Product media uses runtime Supabase URLs. */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Package,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  cn,
  toast,
} from "@babascamera/ui";

import { StatusBadge } from "@/components/status-badge";
import {
  normalizeProductListQuery,
  type CatalogOption,
  type ProductListQuery,
} from "@/features/catalog/types";
import type { ProductListPage } from "@/features/catalog/types";
import { ProductFilters } from "@/features/catalog/components/product-filters";
import {
  buildProductNavigationParams,
  clearProductFilterDraft,
} from "@/features/catalog/components/product-filter-model";
import {
  catalogApi,
} from "@/features/catalog/api/catalog-api-client";
import { formatMoney } from "@/lib/money";

type Product = ProductListPage["rows"][number];

type CategoryOption = CatalogOption;
type BrandOption = CatalogOption;

type ConfirmMode = "single" | "bulk";
type Filters = ReturnType<typeof normalizeProductListQuery>;
type OpenPanel = "sort" | null;

const sortOptions = [
  { label: "Newest", sort: "createdAt", order: "desc" },
  { label: "Oldest", sort: "createdAt", order: "asc" },
  { label: "Product name A-Z", sort: "name", order: "asc" },
  { label: "Product name Z-A", sort: "name", order: "desc" },
  { label: "Price low to high", sort: "price", order: "asc" },
  { label: "Price high to low", sort: "price", order: "desc" },
  { label: "Inventory low to high", sort: "stock", order: "asc" },
  { label: "Inventory high to low", sort: "stock", order: "desc" },
] as const;

function productInventoryLabel(product: Product) {
  if (product.stock <= 0) return "Out of stock";
  if (product.stock <= product.threshold) return "Low stock";
  return `${product.stock} in stock`;
}

function productInventoryTone(product: Product) {
  if (product.stock <= 0) return "border-rose-200 bg-rose-50 text-rose-700";
  if (product.stock <= product.threshold) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function clearFilters(current: Filters): Filters {
  return {
    ...current,
    q: "",
    status: "all",
    category: "all",
    brand: "all",
    inventory: "all",
    sort: "createdAt",
    order: "desc",
    page: 1,
    pageSize: current.pageSize,
  };
}

function resetStatusView(filters: Filters): Filters {
  if (filters.status === "low-stock") {
    return { ...filters, status: "all", inventory: "low-stock", page: 1 };
  }
  return filters;
}

function hasActiveListState(filters: Filters) {
  return (
    filters.q !== ""
    || filters.status !== "all"
    || filters.category !== "all"
    || filters.brand !== "all"
    || filters.inventory !== "all"
    || filters.sort !== "createdAt"
    || filters.order !== "desc"
  );
}

function sortLabel(filters: Filters) {
  return sortOptions.find((option) => option.sort === filters.sort && option.order === filters.order)?.label ?? "Newest";
}

function statusLabel(status: Filters["status"]) {
  if (status === "active") return "Active";
  if (status === "inactive") return "Inactive";
  if (status === "low-stock") return "Low stock";
  return "All";
}

function inventoryLabel(inventory: Filters["inventory"]) {
  if (inventory === "in-stock") return "In stock";
  if (inventory === "low-stock") return "Low stock";
  if (inventory === "out-of-stock") return "Out of stock";
  return "All inventory";
}

function useCloseOnOutside<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);
  return ref;
}

export function ProductTable({
  data,
  categories,
  brands,
  query,
}: {
  data: ProductListPage;
  categories: CategoryOption[];
  brands: BrandOption[];
  query: ProductListQuery;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isNavigating, startNavigation] = useTransition();
  const [selected, setSelected] = useState(new Set<string>());
  const [deleteMode, setDeleteMode] = useState<ConfirmMode | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(() => normalizeProductListQuery(query));
  const [searchValue, setSearchValue] = useState(() => normalizeProductListQuery(query).q);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [rows, setRows] = useState(data.rows);
  const querySignature = [
    query.q ?? "",
    query.status ?? "",
    query.category ?? "",
    query.brand ?? "",
    query.inventory ?? "",
    query.sort ?? "",
    query.order ?? "",
    query.page ?? "",
    query.pageSize ?? "",
  ].join("|");
  const rowsSignature = data.rows
    .map((row) => `${row.id}:${row.isActive ? 1 : 0}:${row.stock}:${row.threshold}`)
    .join("|");

  const sortRef = useCloseOnOutside<HTMLDivElement>(openPanel === "sort", () => setOpenPanel(null));

  useEffect(() => {
    const next = resetStatusView(normalizeProductListQuery(query));
    setFilters(next);
    setSearchValue(next.q);
    setSelected(new Set());
    setRows(data.rows);
  // App Router can deserialize equivalent query/row values into new references.
  // Synchronize only when their meaningful values change to avoid a render loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [querySignature, rowsSignature]);

  useEffect(() => {
    if (searchValue === filters.q) return;
    const timer = window.setTimeout(() => {
      const next = { ...filters, q: searchValue, page: 1 };
      setFilters(next);
      const params = buildProductNavigationParams(
        new URLSearchParams(searchParams.toString()),
        next,
      );
      const nextPath = params.toString() ? `${pathname}?${params}` : pathname;
      startNavigation(() => router.replace(nextPath, { scroll: false }));
    }, 240);
    return () => window.clearTimeout(timer);
  }, [filters, pathname, router, searchParams, searchValue]);

  const tabs = useMemo(() => [
    { key: "all", label: "All", value: data.counts.all },
    { key: "active", label: "Active", value: data.counts.active },
    { key: "inactive", label: "Inactive", value: data.counts.inactive },
    { key: "low-stock", label: "Low stock", value: data.counts.lowStock },
  ] as const, [data.counts]);

  const categoryById = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories]);
  const brandById = useMemo(() => new Map(brands.map((item) => [item.id, item])), [brands]);

  const hasFilters = hasActiveListState(filters);
  const activeTab = filters.status === "active" || filters.status === "inactive"
    ? filters.status
    : filters.inventory === "low-stock"
      ? "low-stock"
      : "all";
  const allRowsSelected = rows.length > 0 && rows.every((product) => selected.has(product.id));
  const pageRowsStart = data.total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const pageRowsEnd = Math.min(filters.page * filters.pageSize, data.total);

  const navigateToFilters = (next: Filters) => {
    const normalized = resetStatusView(next);
    setFilters(normalized);
    const params = buildProductNavigationParams(
      new URLSearchParams(searchParams.toString()),
      normalized,
    );
    const nextPath = params.toString() ? `${pathname}?${params}` : pathname;
    startNavigation(() => router.replace(nextPath, { scroll: false }));
  };

  const setFilter = (next: Partial<Filters>, resetPage = true) => {
    if (next.q !== undefined) setSearchValue(next.q);
    navigateToFilters(resetStatusView({
      ...filters,
      ...next,
      page: resetPage ? 1 : next.page ?? filters.page,
    }));
  };

  const clearAppliedFilters = () => {
    setFilter(clearProductFilterDraft());
  };

  const toggleProduct = (product: Product) => {
    const payload = new FormData();
    payload.set("id", product.id);
    payload.set("isActive", String(!product.isActive));
    setRows((current) => current.map((item) => item.id === product.id
      ? { ...item, isActive: !product.isActive }
      : item));
    startTransition(async () => {
      const result = await catalogApi.setProductStatus(product.id, payload);
      if (!result.success) {
        setRows((current) => current.map((item) => item.id === product.id
          ? { ...item, isActive: product.isActive }
          : item));
        toast.error(result.error);
      } else toast.success(`Product ${product.isActive ? "deactivated" : "activated"}.`);
    });
  };

  const updateStatus = (nextStatus: boolean) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const payload = new FormData();
    payload.set("productIds", JSON.stringify(ids));
    payload.set("isActive", String(nextStatus));
    setRows((current) => current.map((item) => ids.includes(item.id)
      ? { ...item, isActive: nextStatus }
      : item));
    startTransition(async () => {
      const result = await catalogApi.bulkProductStatus(payload);
      if (!result.success) {
        router.refresh();
        toast.error(result.error);
      }
      else toast.success(`Updated ${ids.length} product${ids.length === 1 ? "" : "s"}.`);
      setSelected(new Set());
    });
  };

  const requestDelete = (ids: string[]) => {
    setDeleteTargets(ids);
    setDeleteMode(ids.length > 1 ? "bulk" : "single");
  };

  const confirmDelete = async () => {
    if (!deleteTargets.length) return;
    const payload = new FormData();
    startTransition(async () => {
      let result;
      if (deleteTargets.length === 1) {
        const [id] = deleteTargets;
        if (!id) return;
        result = await catalogApi.deleteProduct(id);
      } else {
        payload.set("productIds", JSON.stringify(deleteTargets));
        result = await catalogApi.bulkDeleteProducts(payload);
      }
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(deleteTargets.length === 1 ? "Product deleted." : "Products deleted.");
      setRows((current) => current.filter((item) => !deleteTargets.includes(item.id)));
      setSelected(new Set());
      setDeleteTargets([]);
      setDeleteMode(null);
    });
  };

  const filterChips = [
    filters.status !== "all" ? { key: "status", label: `Status: ${statusLabel(filters.status)}`, clear: () => setFilter({ status: "all" }) } : null,
    filters.inventory !== "all" ? { key: "inventory", label: `Inventory: ${inventoryLabel(filters.inventory)}`, clear: () => setFilter({ inventory: "all" }) } : null,
    filters.category !== "all" ? { key: "category", label: `Category: ${categoryById.get(filters.category)?.name ?? "Selected"}`, clear: () => setFilter({ category: "all" }) } : null,
    filters.brand !== "all" ? { key: "brand", label: `Brand: ${filters.brand === "none" ? "No brand" : brandById.get(filters.brand)?.name ?? "Selected"}`, clear: () => setFilter({ brand: "all" }) } : null,
  ].filter((chip): chip is NonNullable<typeof chip> => Boolean(chip));

  return (
    <section className="w-full min-w-0">
      <div className="w-full min-w-0 rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap gap-1 border-b border-slate-200 px-3 pt-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-slate-900 text-slate-950"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:text-slate-900",
              )}
              onClick={() => {
                if (tab.key === "low-stock") {
                  setFilter({ status: "all", inventory: "low-stock" });
                } else if (tab.key === "all") {
                  setFilter({ status: "all", inventory: "all" });
                } else {
                  setFilter({ status: tab.key });
                }
              }}
            >
              {tab.label} <span className="ml-1 text-xs font-normal text-slate-400">{tab.value}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-2 border-b border-slate-200 p-3">
          {selected.size > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm font-medium text-slate-700">
                {selected.size} product{selected.size === 1 ? "" : "s"} selected
                <span className="ml-2 font-normal text-slate-500">Current page only</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => updateStatus(true)} disabled={isPending}>Activate</Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(false)} disabled={isPending}>Deactivate</Button>
                <Button size="sm" variant="outline" onClick={() => setSelected(new Set())}>Clear</Button>
                <Button size="sm" variant="destructive" onClick={() => requestDelete(Array.from(selected))} disabled={isPending}>Delete</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search products"
                  type="search"
                  className="h-9 rounded-md pl-9 pr-9"
                />
                {searchValue ? (
                  <button
                    type="button"
                    aria-label="Clear product search"
                    className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => setSearchValue("")}
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </label>

              <ProductFilters
                applied={filters}
                categories={categories}
                brands={brands}
                isPending={isNavigating}
                onApply={navigateToFilters}
              />

              <div ref={sortRef} className="relative">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-full justify-center md:w-auto"
                  aria-expanded={openPanel === "sort"}
                  onClick={() => setOpenPanel((panel) => (panel === "sort" ? null : "sort"))}
                >
                  <ArrowUpDown className="size-4" />
                  {filters.sort === "createdAt" && filters.order === "desc" ? "Sort" : sortLabel(filters)}
                </Button>
                {openPanel === "sort" ? (
                  <div role="menu" className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
                    {sortOptions.map((option) => {
                      const active = filters.sort === option.sort && filters.order === option.order;
                      return (
                        <button
                          key={`${option.sort}:${option.order}`}
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          className={cn("flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50", active && "bg-slate-100 text-slate-950")}
                          onClick={() => {
                            setFilter({ sort: option.sort, order: option.order });
                            setOpenPanel(null);
                          }}
                        >
                          {option.label}
                          {active ? <Check className="size-4 text-slate-700" aria-hidden="true" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {filterChips.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {filterChips.map((chip) => (
                <span key={chip.key} className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-600">
                  {chip.label}
                  <button type="button" aria-label={`Remove ${chip.label}`} className="rounded p-0.5 hover:bg-slate-200" onClick={chip.clear}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <button type="button" className="text-xs font-medium text-slate-500 hover:text-slate-900" onClick={clearAppliedFilters}>
                Clear all
              </button>
            </div>
          ) : null}
          <p className="sr-only" aria-live="polite">
            {isNavigating ? "Updating product results." : `${data.total} product results.`}
          </p>
        </div>

        <div
          className={cn("overflow-x-auto transition-opacity", isNavigating && "opacity-65")}
          aria-busy={isNavigating}
        >
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-medium text-slate-500">
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    aria-label="Select all products on this page"
                    checked={allRowsSelected}
                    onChange={(event) => {
                      setSelected(event.target.checked ? new Set(rows.map((item) => item.id)) : new Set());
                    }}
                  />
                </th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Inventory</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Brand</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="w-10 px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border-t border-slate-100 px-3 py-12 text-center">
                    <div className="grid justify-items-center gap-3 text-slate-500">
                      <ShoppingBag className="size-8" />
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">{filters.q || hasFilters ? "No products found" : "Add your first product"}</h3>
                        <p className="mt-1 text-sm">{hasFilters ? "Adjust your search or clear filters." : "Create products manually or import them from Excel."}</p>
                      </div>
                      {hasFilters ? <Button size="sm" variant="outline" onClick={() => setFilter(clearFilters(filters))}>Clear filters</Button> : null}
                    </div>
                  </td>
                </tr>
              ) : null}

              {rows.map((product) => (
                <tr key={product.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Select ${product.name}`}
                      checked={selected.has(product.id)}
                      onChange={(event) => {
                        setSelected((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(product.id);
                          else next.delete(product.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="size-10 rounded-md object-cover" />
                      ) : (
                        <span className="grid size-10 place-items-center rounded-md bg-slate-100 text-slate-400"><Package className="size-4" /></span>
                      )}
                      <div className="min-w-0">
                        <Link href={`/products/${product.id}/edit`} className="block truncate text-sm font-medium text-slate-900 hover:underline">
                          {product.name}
                        </Link>
                        <p className="truncate text-xs text-slate-500">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={product.isActive ? "active" : "inactive"} /></td>
                  <td className="px-3 py-2">
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", productInventoryTone(product))}>
                      {productInventoryLabel(product)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{product.category}</td>
                  <td className="px-3 py-2 text-slate-700">{product.brand ?? "-"}</td>
                  <td className="px-3 py-2 text-right text-slate-900">
                    <p className="font-medium">{formatMoney(product.salePrice)}</p>
                    {product.mrp !== product.salePrice ? <p className="text-xs text-slate-500">MRP {formatMoney(product.mrp)}</p> : null}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <details className="relative inline-block">
                      <summary aria-label={`Open actions for ${product.name}`} className="grid size-8 cursor-pointer list-none place-items-center rounded-md text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 [&::-webkit-details-marker]:hidden">
                        <MoreHorizontal className="size-4" />
                      </summary>
                      <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-left text-sm shadow-lg">
                        <Link href={`/products/${product.id}/edit`} className="block px-3 py-2 hover:bg-slate-50">Edit product</Link>
                        <button type="button" className="w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => toggleProduct(product)}>
                          {product.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <div className="my-1 border-t border-slate-100" />
                        <button type="button" className="w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50" onClick={() => requestDelete([product.id])}>
                          Delete product
                        </button>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-2">
          <p className="text-sm text-slate-600">
            {data.total === 0 ? "No products" : `Showing ${pageRowsStart}-${pageRowsEnd} of ${data.total} products`}
          </p>
          <div className="flex items-center gap-2">
            <select
              value={String(filters.pageSize)}
              aria-label="Products per page"
              onChange={(event) => setFilter({ pageSize: Number(event.target.value) })}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700"
            >
              {[25, 50, 100].map((value) => <option key={value} value={value}>{value} per page</option>)}
            </select>
            <Button size="icon" variant="outline" aria-label="Previous page" title="Previous page" disabled={filters.page <= 1 || data.total === 0} onClick={() => setFilter({ page: Math.max(1, filters.page - 1) }, false)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="icon" variant="outline" aria-label="Next page" title="Next page" disabled={filters.page >= data.totalPages || data.total === 0} onClick={() => setFilter({ page: Math.min(data.totalPages || 1, filters.page + 1) }, false)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(deleteMode)} onOpenChange={(open) => {
        if (open) return;
        setDeleteMode(null);
        setDeleteTargets([]);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              {deleteMode === "bulk" ? "Delete selected products?" : "Delete product?"}
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. Products with order or inventory history cannot be deleted and will be blocked by server-side safety checks.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setDeleteMode(null); setDeleteTargets([]); }}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={confirmDelete} disabled={isPending}>
              {isPending ? "Deleting..." : `Delete ${deleteTargets.length} product${deleteTargets.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default ProductTable;
