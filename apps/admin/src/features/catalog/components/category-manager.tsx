"use client";

/* eslint-disable @next/next/no-img-element -- Category media uses administrator-managed runtime URLs. */

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Form,
  Input,
  Label,
  cn,
  toast,
} from "@babascamera/ui";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  GripVertical,
  ImageIcon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import {
  AdminCheckboxField,
  AdminInputField,
  AdminSearchSelectField,
} from "@/components/admin-form-field";
import { SortableDragHandle, SortableList, SortableListItem } from "@/components/sortable-list";
import { AdminPageHeader } from "@/components/ui/admin-page";
import {
  buildCategoryTreeRows,
  filterCategoryRows,
  getDescendantIds,
  reorderCategorySiblings,
  wouldCreateRecursiveParent,
  type CategoryFilters,
  type CategoryTreeRow,
} from "@/features/catalog/components/category-tree";
import { catalogApi } from "@/features/catalog/api/catalog-api-client";
import { categoryClientSchema } from "@/features/catalog/schemas/category";
import type { CategoryListItem } from "@/features/catalog/types";

type Category = CategoryListItem;
type Values = z.infer<typeof categoryClientSchema>;

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = 5 * 1024 * 1024;

function normalizeStatus(value: string | null): CategoryFilters["status"] {
  return value === "active" || value === "inactive" ? value : "all";
}

function normalizeParent(value: string | null): CategoryFilters["parentId"] {
  if (!value || value === "all" || value === "top") return value === "top" ? "top" : "all";
  return value;
}

function CategoryStatus({ active }: { active: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
      active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600",
    )}>
      <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function CategoryTreeToggle({
  expanded,
  hasChildren,
  name,
  onToggle,
}: {
  expanded: boolean;
  hasChildren: boolean;
  name: string;
  onToggle: () => void;
}) {
  if (!hasChildren) return <span className="size-7 shrink-0" aria-hidden="true" />;
  const Icon = expanded ? ChevronDown : ChevronRight;
  return (
    <button
      type="button"
      aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`}
      className="grid size-7 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <Icon className="size-4" />
    </button>
  );
}

function CategoryActionsMenu({
  category,
  disabled,
  onAddChild,
  onDelete,
  onEdit,
  onToggleActive,
}: {
  category: CategoryTreeRow;
  disabled: boolean;
  onAddChild: (category: Category) => void;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  onToggleActive: (category: Category) => void;
}) {
  const deleteUnavailableReason = category.productCount > 0
    ? "Move or remove products before deleting."
    : category.childCount > 0
      ? "Move or delete child categories before deleting."
      : "";

  return (
    <details className="relative">
      <summary
        aria-label={`Open actions for ${category.name}`}
        className="grid size-9 cursor-pointer list-none place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 [&::-webkit-details-marker]:hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <MoreHorizontal className="size-4" />
      </summary>
      <div
        className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => onEdit(category)}>
          Edit category
        </button>
        <button type="button" className="w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => onAddChild(category)}>
          Add child category
        </button>
        <button
          type="button"
          disabled={disabled}
          className="w-full px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onToggleActive(category)}
        >
          {category.isActive ? "Deactivate" : "Activate"}
        </button>
        <Link href={`/products?category=${category.id}`} className="block px-3 py-2 hover:bg-slate-50">
          View products
        </Link>
        <div className="my-1 border-t border-slate-100" />
        <button
          type="button"
          disabled={Boolean(deleteUnavailableReason) || disabled}
          title={deleteUnavailableReason || "Delete category"}
          className="w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:bg-white disabled:text-slate-400"
          onClick={() => onDelete(category)}
        >
          Delete category
        </button>
        {deleteUnavailableReason ? <p className="px-3 pb-2 text-xs text-slate-500">{deleteUnavailableReason}</p> : null}
      </div>
    </details>
  );
}

const CategoryResourceRow = memo(function CategoryResourceRow({
  category,
  disabled,
  expanded,
  onAddChild,
  onDelete,
  onEdit,
  onToggleActive,
  onToggleExpanded,
  reorderMode,
}: {
  category: CategoryTreeRow;
  disabled: boolean;
  expanded: boolean;
  onAddChild: (category: Category) => void;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  onToggleActive: (category: Category) => void;
  onToggleExpanded: (categoryId: string) => void;
  reorderMode: boolean;
}) {
  const isChild = category.depth > 0;
  const content = (
    <div
      className={cn(
        "grid min-h-14 grid-cols-1 items-center gap-2 border-t border-slate-100 px-3 py-2 transition-colors hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_88px_96px_44px] sm:gap-3",
        isChild && "bg-slate-50/45",
        reorderMode && "bg-white",
      )}
      onClick={() => {
        if (!reorderMode) onEdit(category);
      }}
    >
      <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${Math.min(category.depth, 5) * 28}px` }}>
        {reorderMode ? (
          <SortableDragHandle label={`Reorder ${category.name}`} disabled={disabled} className="size-8 text-slate-500" />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center text-slate-300" aria-hidden="true">
            <GripVertical className="size-4" />
          </span>
        )}
        <CategoryTreeToggle
          expanded={expanded}
          hasChildren={category.hasChildren}
          name={category.name}
          onToggle={() => onToggleExpanded(category.id)}
        />
        {isChild ? (
          <span className="grid size-5 shrink-0 place-items-center text-slate-300" aria-hidden="true">
            <span className="h-px w-4 bg-slate-300" />
          </span>
        ) : null}
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100 text-slate-400">
          {category.imageUrl ? <img src={category.imageUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="size-4" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-slate-900">{category.name}</span>
          <span className="block truncate text-xs text-slate-500">
            {category.parentPath ? `${category.parentPath} / ` : category.isOrphan ? "Invalid parent / " : ""}
            {category.childCount ? `${category.childCount} child${category.childCount === 1 ? "" : "ren"}` : "No children"}
          </span>
        </span>
      </div>
      <span className="hidden text-sm tabular-nums text-slate-600 sm:block">{category.productCount}</span>
      <span className="hidden sm:block"><CategoryStatus active={category.isActive} /></span>
      <div className="flex items-center justify-between gap-2 pl-10 sm:justify-end sm:pl-0">
        <span className="sm:hidden"><CategoryStatus active={category.isActive} /></span>
        {reorderMode ? null : (
          <CategoryActionsMenu
            category={category}
            disabled={disabled}
            onAddChild={onAddChild}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggleActive={onToggleActive}
          />
        )}
      </div>
    </div>
  );

  if (!reorderMode) return content;
  return (
    <SortableListItem
      id={category.id}
      disabled={disabled}
      draggingClassName="relative z-10 bg-white opacity-90"
    >
      {content}
    </SortableListItem>
  );
});

function CategoryFiltersBar({
  disabled,
  filters,
  onFiltersChange,
  parentOptions,
}: {
  disabled: boolean;
  filters: CategoryFilters;
  onFiltersChange: (filters: CategoryFilters) => void;
  parentOptions: Category[];
}) {
  const clearDisabled = filters.query === "" && filters.status === "all" && filters.parentId === "all";
  return (
    <div className="w-full min-w-0">
      <div className="mb-3 flex flex-wrap gap-1">
        {(["all", "active", "inactive"] as const).map((status) => (
          <button
            key={status}
            type="button"
            disabled={disabled}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors hover:bg-slate-100 disabled:opacity-50",
              filters.status === status ? "bg-slate-900 text-white hover:bg-slate-900" : "text-slate-600",
            )}
            onClick={() => onFiltersChange({ ...filters, status })}
          >
            {status}
          </button>
        ))}
      </div>
      <div className="grid w-full min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_160px_220px_auto]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={filters.query}
            disabled={disabled}
            onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
            placeholder="Search categories"
            className="h-9 rounded-md pl-9 pr-9"
            type="search"
          />
          {filters.query ? (
            <button
              type="button"
              disabled={disabled}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100"
              onClick={() => onFiltersChange({ ...filters, query: "" })}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </label>
        <select
          value={filters.status}
          disabled={disabled}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm disabled:opacity-50"
          aria-label="Status"
          onChange={(event) => onFiltersChange({ ...filters, status: normalizeStatus(event.target.value) })}
        >
          <option value="all">Any status</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <select
          value={filters.parentId}
          disabled={disabled}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm disabled:opacity-50"
          aria-label="Parent"
          onChange={(event) => onFiltersChange({ ...filters, parentId: normalizeParent(event.target.value) })}
        >
          <option value="all">Any parent</option>
          <option value="top">Top level</option>
          {parentOptions.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <Button type="button" variant="ghost" size="sm" disabled={disabled || clearDisabled} onClick={() => onFiltersChange({ query: "", status: "all", parentId: "all" })}>
          Clear filters
        </Button>
      </div>
    </div>
  );
}

function CategoryImageField({
  currentImageUrl,
  disabled,
  file,
  onFileChange,
  onRemoveChange,
  removeImage,
}: {
  currentImageUrl: string | null;
  disabled: boolean;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onRemoveChange: (value: boolean) => void;
  removeImage: boolean;
}) {
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const shownUrl = previewUrl ?? (removeImage ? null : currentImageUrl);

  return (
    <div className="grid gap-2">
      <Label htmlFor="category-image">Category image</Label>
      <div className="flex items-center gap-3">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-md bg-slate-100 text-slate-400">
          {shownUrl ? <img src={shownUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="size-5" />}
        </span>
        <div className="grid gap-2">
          <Input
            id="category-image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled}
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              if (!nextFile) {
                onFileChange(null);
                return;
              }
              if (!imageTypes.has(nextFile.type)) {
                toast.error("Use JPEG, PNG, or WebP images.");
                event.target.value = "";
                return;
              }
              if (nextFile.size > maxImageBytes) {
                toast.error("Image must be 5 MiB or smaller.");
                event.target.value = "";
                return;
              }
              onRemoveChange(false);
              onFileChange(nextFile);
            }}
          />
          <div className="flex flex-wrap gap-2">
            {(currentImageUrl || file) && !removeImage ? (
              <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => { onFileChange(null); onRemoveChange(Boolean(currentImageUrl)); }}>
                Remove image
              </Button>
            ) : null}
            {removeImage ? (
              <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => onRemoveChange(false)}>
                Undo remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500">JPEG, PNG, or WebP. Maximum 5 MiB.</p>
    </div>
  );
}

function CategoryForm({
  categories,
  editing,
  initialParentId,
  onCancel,
  onSaved,
}: {
  categories: Category[];
  editing: Category | null;
  initialParentId?: string | null;
  onCancel: () => void;
  onSaved: (category: Category) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [showParentSelector, setShowParentSelector] = useState(Boolean(editing?.parentId || initialParentId));
  const form = useForm<Values>({
    resolver: zodResolver(categoryClientSchema),
    defaultValues: {
      name: editing?.name ?? "",
      parentId: editing?.parentId ?? initialParentId ?? "",
      isActive: editing?.isActive ?? true,
    },
  });
  const invalidParentIds = useMemo(() => {
    if (!editing) return new Set<string>();
    return new Set([editing.id, ...getDescendantIds(editing.id, categories)]);
  }, [categories, editing]);
  const parentOptions = useMemo(() => {
    const rows = buildCategoryTreeRows(categories);
    return rows
      .filter((category) => !invalidParentIds.has(category.id))
      .map((category) => ({
        value: category.id,
        label: `${"  ".repeat(category.depth)}${category.name}`,
        description: category.parentPath || "Top level",
        badge: category.isActive ? "Active" : "Inactive",
      }));
  }, [categories, invalidParentIds]);

  const submit = form.handleSubmit(async (values) => {
    if (editing && wouldCreateRecursiveParent(editing.id, values.parentId || null, categories)) {
      form.setError("parentId", { message: "A category cannot be moved under itself or its children." });
      form.setFocus("parentId");
      return;
    }
    const payload = new FormData();
    if (editing) payload.set("id", editing.id);
    payload.set("name", values.name);
    payload.set("parentId", values.parentId ?? "");
    payload.set("isActive", String(values.isActive));
    if (removeImage) payload.set("removeImage", "true");
    if (file) payload.set("image", file);
    try {
      const result = editing
        ? await catalogApi.updateCategory<Category>(editing.id, payload)
        : await catalogApi.createCategory<Category>(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Category saved.");
      onSaved(result.data);
    } catch (error) {
      console.error("Category save request failed.", error);
      toast.error("Category could not be saved.");
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={submit} className="grid gap-4">
        <AdminInputField name="name" label="Category name" inputProps={{ autoFocus: true }} />
        <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Label>Parent category <span className="font-normal text-slate-500">(optional)</span></Label>
              <p className="mt-1 text-xs text-slate-500">
                Leave this empty to create a main category. Select a parent only when creating a subcategory.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setShowParentSelector((value) => {
                  const next = !value;
                  if (!next) form.setValue("parentId", "");
                  return next;
                });
              }}
            >
              {showParentSelector ? "Use top level" : "Add as subcategory"}
            </Button>
          </div>
          {showParentSelector ? (
            <AdminSearchSelectField
              name="parentId"
              label="Choose parent"
              allowEmpty
              emptyValueLabel="Top level"
              placeholder="Top level"
              searchPlaceholder="Search parent categories"
              emptyLabel="No parent categories found."
              options={parentOptions}
            />
          ) : (
            <p className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-700">Top level category</p>
          )}
        </div>
        <CategoryImageField
          currentImageUrl={editing?.imageUrl ?? null}
          disabled={form.formState.isSubmitting}
          file={file}
          onFileChange={setFile}
          onRemoveChange={setRemoveImage}
          removeImage={removeImage}
        />
        <AdminCheckboxField name="isActive" label="Active" />
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" disabled={form.formState.isSubmitting} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save category"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function DeleteCategoryDialog({
  category,
  onCancel,
  onDeleted,
}: {
  category: Category | null;
  onCancel: () => void;
  onDeleted: (categoryId: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  if (!category) return null;
  const blockedReason = category.productCount > 0
    ? "This category contains products. Move or remove those products first."
    : "";
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete category?</DialogTitle>
          <DialogDescription>
            {blockedReason || `This will permanently delete "${category.name}". This action cannot be undone.`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancel</Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || Boolean(blockedReason)}
            onClick={() => {
              startTransition(async () => {
                try {
                  const result = await catalogApi.deleteCategory(category.id);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Category deleted.");
                  onDeleted(category.id);
                } catch (error) {
                  console.error("Category deletion request failed.", error);
                  toast.error("Category could not be deleted.");
                }
              });
            }}
          >
            {pending ? "Deleting..." : "Delete category"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const searchParams = useSearchParams();
  const [localCategories, setLocalCategories] = useState(categories);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set<string>());
  const [filters, setFilters] = useState<CategoryFilters>(() => ({
    query: searchParams.get("q") ?? "",
    status: normalizeStatus(searchParams.get("status")),
    parentId: normalizeParent(searchParams.get("parent")),
  }));
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const [initialParentId, setInitialParentId] = useState<string | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [isSavingOrder, startReorder] = useTransition();
  const [isChangingStatus, startStatusChange] = useTransition();
  const deferredQuery = useDeferredValue(filters.query);
  const effectiveFilters = useMemo(() => ({ ...filters, query: deferredQuery }), [deferredQuery, filters]);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    if (reorderMode) return;
    const timeout = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (filters.query.trim()) params.set("q", filters.query.trim());
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.parentId !== "all") params.set("parent", filters.parentId);
      const next = params.toString() ? `/categories?${params}` : "/categories";
      window.history.replaceState(null, "", next);
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [filters, reorderMode]);

  const rows = useMemo(() => {
    if (effectiveFilters.query || effectiveFilters.status !== "all" || effectiveFilters.parentId !== "all") {
      return filterCategoryRows(localCategories, effectiveFilters);
    }
    return buildCategoryTreeRows(localCategories, expandedIds);
  }, [effectiveFilters, expandedIds, localCategories]);

  const hasFilters = filters.query.trim() !== "" || filters.status !== "all" || filters.parentId !== "all";
  const disabled = isSavingOrder || isChangingStatus;

  const openCreate = useCallback((parentId: string | null = null) => {
    setInitialParentId(parentId);
    setEditing(null);
  }, []);

  const upsertCategory = useCallback((category: Category) => {
    setLocalCategories((current) => {
      const exists = current.some((item) => item.id === category.id);
      return exists ? current.map((item) => (item.id === category.id ? category : item)) : [...current, category];
    });
    setEditing(undefined);
  }, []);

  const toggleExpanded = useCallback((categoryId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const toggleActive = useCallback((category: Category) => {
    const previous = localCategories;
    setLocalCategories((current) => current.map((item) => (
      item.id === category.id ? { ...item, isActive: !item.isActive } : item
    )));
    startStatusChange(async () => {
      const payload = new FormData();
      payload.set("id", category.id);
      payload.set("isActive", String(!category.isActive));
      try {
        const result = await catalogApi.setCategoryStatus<Category>(category.id, payload);
        if (!result.success) {
          setLocalCategories(previous);
          toast.error(result.error);
          return;
        }
        setLocalCategories((current) => current.map((item) => (item.id === result.data.id ? result.data : item)));
      } catch (error) {
        console.error("Category status request failed.", error);
        setLocalCategories(previous);
        toast.error("Category status could not be changed.");
      }
    });
  }, [localCategories]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const previous = localCategories;
    const result = reorderCategorySiblings(localCategories, String(active.id), String(over.id));
    if (!result.ok) {
      toast.error(result.reason === "cross-parent" ? "Reorder is limited to categories with the same parent." : "Category order is stale.");
      return;
    }
    setLocalCategories(result.categories);
    startReorder(async () => {
      const payload = new FormData();
      payload.set("parentId", result.parentId ?? "");
      payload.set("orderedCategoryIds", JSON.stringify(result.orderedCategoryIds));
      try {
        const response = await catalogApi.reorderCategories(payload);
        if (!response.success) {
          setLocalCategories(previous);
          toast.error(response.error);
          return;
        }
        toast.success("Category order saved.");
      } catch (error) {
        console.error("Category reorder request failed.", error);
        setLocalCategories(previous);
        toast.error("Category order could not be saved.");
      }
    });
  }, [localCategories]);

  const resourceList = (
    <div>
      <div className="hidden min-h-10 grid-cols-[minmax(0,1fr)_88px_96px_44px] items-center border-t border-slate-200 bg-slate-50 px-3 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
        <span>Category</span>
        <span>Products</span>
        <span>Status</span>
        <span className="sr-only">Actions</span>
      </div>
      {rows.map((category) => {
        const row = (
          <CategoryResourceRow
            key={category.id}
            category={category}
            disabled={disabled}
            expanded={expandedIds.has(category.id)}
            onAddChild={(item) => openCreate(item.id)}
            onDelete={(item) => setDeleteCategory(item)}
            onEdit={(item) => { setInitialParentId(null); setEditing(item); }}
            onToggleActive={toggleActive}
            onToggleExpanded={toggleExpanded}
            reorderMode={reorderMode && !hasFilters}
          />
        );
        return row;
      })}
    </div>
  );

  return (
    <section className="grid w-full min-w-0 gap-4">
      <AdminPageHeader
        title="Categories"
        secondaryActions={
          <Button type="button" size="sm" onClick={() => openCreate()}>
            <Plus className="size-4" /> Add category
          </Button>
        }
      />

      <div className="w-full min-w-0 rounded-lg border border-slate-200 bg-white">
        <div className="grid w-full min-w-0 gap-3 p-3">
          <CategoryFiltersBar
            disabled={reorderMode}
            filters={filters}
            onFiltersChange={setFilters}
            parentOptions={localCategories}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {isSavingOrder ? <span className="text-xs text-slate-500">Saving order...</span> : null}
            {!isSavingOrder ? <span aria-hidden="true" /> : null}
            {reorderMode ? (
              <>
                <Button type="button" size="sm" variant="outline" disabled={isSavingOrder} onClick={() => setReorderMode(false)}>
                  Done
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={hasFilters || localCategories.length < 2}
                title={hasFilters ? "Clear filters before reordering." : "Reorder categories"}
                onClick={() => setReorderMode(true)}
              >
                <RotateCcw className="size-4" /> Reorder categories
              </Button>
            )}
          </div>
        </div>

        {localCategories.length === 0 ? (
          <div className="grid justify-items-center gap-3 border-t border-slate-200 px-4 py-12 text-center">
            <FolderTree className="size-8 text-slate-400" />
            <div>
              <h2 className="text-base font-semibold text-slate-950">Create your first category</h2>
              <p className="mt-1 max-w-sm text-sm text-slate-500">Start with broad groups like Cameras, Lenses, Accessories, or Services.</p>
            </div>
            <Button type="button" size="sm" onClick={() => openCreate()}>
              <Plus className="size-4" /> Add category
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="grid justify-items-center gap-3 border-t border-slate-200 px-4 py-10 text-center">
            <Search className="size-7 text-slate-400" />
            <div>
              <h2 className="text-base font-semibold text-slate-950">No categories found</h2>
              <p className="mt-1 text-sm text-slate-500">Adjust your search or filters.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setFilters({ query: "", status: "all", parentId: "all" })}>
              Clear filters
            </Button>
          </div>
        ) : reorderMode && !hasFilters ? (
          <SortableList
            id="catalog-category-order"
            itemIds={rows.map((category) => category.id)}
            disabled={isSavingOrder}
            onDragEnd={handleDragEnd}
          >
            {resourceList}
          </SortableList>
        ) : (
          resourceList
        )}

        {localCategories.length > 0 && rows.length > 0 ? (
          <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
            Showing {rows.length} categor{rows.length === 1 ? "y" : "ies"}
          </div>
        ) : null}
      </div>

      <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open) setEditing(undefined); }}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
            <DialogDescription>Set the category name, parent, image and active status.</DialogDescription>
          </DialogHeader>
          {editing !== undefined ? (
            <CategoryForm
              key={editing?.id ?? `new-${initialParentId ?? "top"}`}
              categories={localCategories}
              editing={editing}
              initialParentId={initialParentId}
              onCancel={() => setEditing(undefined)}
              onSaved={upsertCategory}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <DeleteCategoryDialog
        category={deleteCategory}
        onCancel={() => setDeleteCategory(null)}
        onDeleted={(categoryId) => {
          setLocalCategories((current) => current.filter((category) => category.id !== categoryId));
          setDeleteCategory(null);
        }}
      />
    </section>
  );
}
