"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button, Input, cn } from "@babascamera/ui";

import type {
  CatalogOption,
  NormalizedProductListQuery,
  ProductInventoryFilter,
  ProductListStatus,
} from "@/features/catalog/types";
import {
  applyProductFilterDraft,
  buildCategoryFilterRows,
  clearProductFilterDraft,
  countProductFilters,
  createProductFilterDraft,
  nextProductFilterViewOnEscape,
  searchCategoryFilterRows,
  updateProductFilterDraft,
  type ProductFilterDraft,
  type ProductFilterView,
} from "./product-filter-model";

interface ProductFiltersProps {
  applied: NormalizedProductListQuery;
  categories: CatalogOption[];
  brands: CatalogOption[];
  isPending?: boolean;
  onApply: (next: NormalizedProductListQuery) => void;
}

interface PanelPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

const statusOptions: { value: ProductListStatus; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const inventoryOptions: { value: ProductInventoryFilter; label: string }[] = [
  { value: "all", label: "Any inventory" },
  { value: "in-stock", label: "In stock" },
  { value: "low-stock", label: "Low stock" },
  { value: "out-of-stock", label: "Out of stock" },
];

function useMobileFilterSheet() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function statusLabel(value: ProductListStatus) {
  if (value === "active") return "Active";
  if (value === "inactive") return "Inactive";
  if (value === "low-stock") return "Low stock";
  return "Any status";
}

function inventoryLabel(value: ProductInventoryFilter) {
  return inventoryOptions.find((option) => option.value === value)?.label ?? "Any inventory";
}

function FilterSummaryRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
      onClick={onClick}
    >
      <span className="min-w-24 font-medium text-slate-800">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-slate-500">{value}</span>
      <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
    </button>
  );
}

function RadioOption({
  checked,
  label,
  secondary,
  depth = 0,
  onSelect,
}: {
  checked: boolean;
  label: string;
  secondary?: string | undefined;
  depth?: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      className={cn(
        "flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] transition-colors",
        "hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-300",
        checked && "bg-slate-100 text-slate-950",
      )}
      style={{ paddingLeft: `${12 + Math.min(depth, 4) * 16}px` }}
      onClick={onSelect}
    >
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full border",
          checked ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white",
        )}
        aria-hidden="true"
      >
        {checked ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{label}</span>
        {secondary ? <span className="block truncate text-xs font-normal text-slate-500">{secondary}</span> : null}
      </span>
    </button>
  );
}

function handleRadioArrowNavigation(event: ReactKeyboardEvent<HTMLDivElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const options = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'),
  );
  if (!options.length) return;
  event.preventDefault();
  const current = document.activeElement as HTMLElement | null;
  const index = current ? options.indexOf(current) : -1;
  const nextIndex = event.key === "Home"
    ? 0
    : event.key === "End"
      ? options.length - 1
      : event.key === "ArrowDown"
        ? (index + 1 + options.length) % options.length
        : (index - 1 + options.length) % options.length;
  options[nextIndex]?.focus();
}

export function ProductFilters({
  applied,
  categories,
  brands,
  isPending = false,
  onApply,
}: ProductFiltersProps) {
  const titleId = useId();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const categorySearchRef = useRef<HTMLInputElement>(null);
  const brandSearchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ProductFilterView>("main");
  const [draft, setDraft] = useState<ProductFilterDraft>(() => createProductFilterDraft(applied));
  const [categorySearch, setCategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [position, setPosition] = useState<PanelPosition>({
    left: 16,
    top: 56,
    width: 360,
    maxHeight: 520,
  });
  const isMobile = useMobileFilterSheet();

  const categoryRows = useMemo(() => buildCategoryFilterRows(categories), [categories]);
  const categoryById = useMemo(
    () => new Map(categoryRows.map((category) => [category.id, category])),
    [categoryRows],
  );
  const filteredCategories = useMemo(
    () => searchCategoryFilterRows(categoryRows, categorySearch),
    [categoryRows, categorySearch],
  );
  const sortedBrands = useMemo(() => [...brands].sort((left, right) =>
    (left.position ?? 0) - (right.position ?? 0)
    || left.name.localeCompare(right.name)), [brands]);
  const filteredBrands = useMemo(() => {
    const query = brandSearch.trim().toLowerCase();
    if (!query) return sortedBrands;
    return sortedBrands.filter((brand) => brand.name.toLowerCase().includes(query));
  }, [brandSearch, sortedBrands]);
  const brandById = useMemo(
    () => new Map(sortedBrands.map((brand) => [brand.id, brand])),
    [sortedBrands],
  );

  const activeCount = countProductFilters(createProductFilterDraft(applied));
  const draftCount = countProductFilters(draft);

  const restoreTriggerFocus = useCallback(() => {
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const closeAsCancel = useCallback(() => {
    setOpen(false);
    setView("main");
    setDraft(createProductFilterDraft(applied));
    setCategorySearch("");
    setBrandSearch("");
    restoreTriggerFocus();
  }, [applied, restoreTriggerFocus]);

  const openFilters = () => {
    setDraft(createProductFilterDraft(applied));
    setView("main");
    setCategorySearch("");
    setBrandSearch("");
    setOpen(true);
  };

  const applyFilters = () => {
    const next = applyProductFilterDraft(applied, draft);
    setOpen(false);
    setView("main");
    onApply(next);
    restoreTriggerFocus();
  };

  useEffect(() => {
    if (!open || isMobile) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 16;
      const gap = 8;
      const width = Math.min(360, viewportWidth - margin * 2);
      const maxHeight = Math.min(520, viewportHeight - margin * 2);
      const triggerRect = trigger.getBoundingClientRect();
      const desiredHeight = view === "main"
        ? Math.min(panel.scrollHeight, maxHeight)
        : maxHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom - margin;
      const spaceAbove = triggerRect.top - margin;
      const openBelow = spaceBelow >= Math.min(desiredHeight, 320) || spaceBelow >= spaceAbove;
      const rawTop = openBelow
        ? triggerRect.bottom + gap
        : triggerRect.top - desiredHeight - gap;
      const top = Math.max(margin, Math.min(rawTop, viewportHeight - desiredHeight - margin));
      const left = Math.max(
        margin,
        Math.min(triggerRect.right - width, viewportWidth - width - margin),
      );
      setPosition({ left, top, width, maxHeight });
    };

    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isMobile, open, view]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      closeAsCancel();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        const nextView = nextProductFilterViewOnEscape(view);
        if (nextView) setView(nextView);
        else closeAsCancel();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute("hidden"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeAsCancel, open, view]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      if (view === "category") categorySearchRef.current?.focus();
      else if (view === "brand") brandSearchRef.current?.focus();
      else panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, view]);

  const setDraftValue = <Key extends keyof ProductFilterDraft>(
    key: Key,
    value: ProductFilterDraft[Key],
  ) => {
    setDraft((current) => updateProductFilterDraft(current, key, value));
  };

  const header = view === "main" ? (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-4">
      <h2 id={titleId} className="text-sm font-semibold text-slate-950">Filters</h2>
      <button
        type="button"
        aria-label="Cancel filters"
        title="Cancel"
        className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        onClick={closeAsCancel}
      >
        <X className="size-4" />
      </button>
    </div>
  ) : (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 px-3">
      <button
        type="button"
        aria-label="Back to filters"
        title="Back"
        className="grid size-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        onClick={() => setView("main")}
      >
        <ArrowLeft className="size-4" />
      </button>
      <h2 id={titleId} className="text-sm font-semibold capitalize text-slate-950">{view}</h2>
    </div>
  );

  const mainView = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <FilterSummaryRow label="Status" value={statusLabel(draft.status)} onClick={() => setView("status")} />
        <FilterSummaryRow label="Inventory" value={inventoryLabel(draft.inventory)} onClick={() => setView("inventory")} />
        <FilterSummaryRow
          label="Category"
          value={draft.category === "all" ? "All categories" : categoryById.get(draft.category)?.name ?? "Selected category"}
          onClick={() => setView("category")}
        />
        <FilterSummaryRow
          label="Brand"
          value={draft.brand === "all" ? "All brands" : draft.brand === "none" ? "No brand" : brandById.get(draft.brand)?.name ?? "Selected brand"}
          onClick={() => setView("brand")}
        />
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-600"
          disabled={draftCount === 0}
          onClick={() => setDraft(clearProductFilterDraft())}
        >
          Clear all
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={closeAsCancel}>Cancel</Button>
          <Button type="button" size="sm" disabled={isPending} onClick={applyFilters}>
            {isPending ? "Applying..." : "Apply filters"}
          </Button>
        </div>
      </div>
    </>
  );

  const simpleOptionsView = (
    options: { value: string; label: string }[],
    selected: string,
    onSelect: (value: string) => void,
  ) => (
    <>
      <div
        role="radiogroup"
        aria-label={`${view} filter`}
        className="min-h-0 flex-1 overflow-y-auto p-2"
        onKeyDown={handleRadioArrowNavigation}
      >
        {options.map((option) => (
          <RadioOption
            key={option.value}
            checked={selected === option.value}
            label={option.label}
            onSelect={() => onSelect(option.value)}
          />
        ))}
      </div>
      <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" size="sm" onClick={() => setView("main")}>Done</Button>
      </div>
    </>
  );

  const categoryView = (
    <>
      <div className="sticky top-0 z-10 shrink-0 border-b border-slate-100 bg-white p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            ref={categorySearchRef}
            type="search"
            value={categorySearch}
            placeholder="Search categories"
            className="h-9 pl-9"
            onChange={(event) => setCategorySearch(event.target.value)}
          />
        </label>
      </div>
      <div
        role="radiogroup"
        aria-label="Category filter"
        className="min-h-0 flex-1 overflow-y-auto p-2"
        onKeyDown={handleRadioArrowNavigation}
      >
        <RadioOption
          checked={draft.category === "all"}
          label="All categories"
          onSelect={() => setDraftValue("category", "all")}
        />
        {filteredCategories.map((category) => (
          <RadioOption
            key={category.id}
            checked={draft.category === category.id}
            label={category.name}
            secondary={[
              category.parentPath || null,
              category.isActive === false ? "Inactive" : null,
            ].filter(Boolean).join(" · ") || undefined}
            depth={categorySearch ? 0 : category.depth}
            onSelect={() => setDraftValue("category", category.id)}
          />
        ))}
        {filteredCategories.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">No categories found.</p>
            <Button type="button" size="sm" variant="outline" onClick={() => setCategorySearch("")}>Clear search</Button>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" size="sm" onClick={() => setView("main")}>Done</Button>
      </div>
    </>
  );

  const brandView = (
    <>
      <div className="sticky top-0 z-10 shrink-0 border-b border-slate-100 bg-white p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            ref={brandSearchRef}
            type="search"
            value={brandSearch}
            placeholder="Search brands"
            className="h-9 pl-9"
            onChange={(event) => setBrandSearch(event.target.value)}
          />
        </label>
      </div>
      <div
        role="radiogroup"
        aria-label="Brand filter"
        className="min-h-0 flex-1 overflow-y-auto p-2"
        onKeyDown={handleRadioArrowNavigation}
      >
        <RadioOption checked={draft.brand === "all"} label="All brands" onSelect={() => setDraftValue("brand", "all")} />
        <RadioOption checked={draft.brand === "none"} label="No brand" onSelect={() => setDraftValue("brand", "none")} />
        {filteredBrands.map((brand) => (
          <RadioOption
            key={brand.id}
            checked={draft.brand === brand.id}
            label={brand.name}
            secondary={brand.isActive === false ? "Inactive" : undefined}
            onSelect={() => setDraftValue("brand", brand.id)}
          />
        ))}
        {filteredBrands.length === 0 ? (
          <div className="grid justify-items-center gap-2 px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-700">No brands found.</p>
            <Button type="button" size="sm" variant="outline" onClick={() => setBrandSearch("")}>Clear search</Button>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" size="sm" onClick={() => setView("main")}>Done</Button>
      </div>
    </>
  );

  let content = mainView;
  if (view === "status") {
    content = simpleOptionsView(
      statusOptions,
      draft.status,
      (value) => setDraftValue("status", value as ProductListStatus),
    );
  } else if (view === "inventory") {
    content = simpleOptionsView(
      inventoryOptions,
      draft.inventory,
      (value) => setDraftValue("inventory", value as ProductInventoryFilter),
    );
  } else if (view === "category") {
    content = categoryView;
  } else if (view === "brand") {
    content = brandView;
  }

  const desktopStyle: CSSProperties = {
    left: position.left,
    top: position.top,
    width: position.width,
    maxHeight: position.maxHeight,
    height: view === "main" ? "auto" : position.maxHeight,
  };

  const overlay = open ? createPortal(
    <>
      {isMobile ? <div className="fixed inset-0 z-[70] bg-slate-950/30" aria-hidden="true" /> : null}
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-modal={isMobile}
        aria-labelledby={titleId}
        className={cn(
          "z-[80] flex flex-col overflow-hidden border border-slate-200 bg-white text-slate-800 shadow-[0_12px_32px_rgba(15,23,42,0.16)]",
          isMobile
            ? "fixed inset-y-0 right-0 w-full max-w-sm rounded-none border-y-0 border-r-0"
            : "fixed rounded-lg",
          isPending && "pointer-events-none opacity-80",
        )}
        style={isMobile ? undefined : desktopStyle}
      >
        {header}
        {content}
      </div>
    </>,
    document.body,
  ) : null;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-full justify-center md:w-auto"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (open) closeAsCancel();
          else openFilters();
        }}
      >
        <SlidersHorizontal className="size-4" />
        Filters
        {activeCount ? (
          <span className="rounded-full bg-slate-900 px-1.5 text-xs text-white">{activeCount}</span>
        ) : null}
      </Button>
      {overlay}
    </>
  );
}
