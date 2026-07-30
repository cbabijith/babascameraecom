"use client";

/* eslint-disable @next/next/no-img-element -- Brand media uses administrator-defined runtime URLs. */

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Form, Input, Label, toast } from "@babascamera/ui";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { StatusBadge } from "@/components/status-badge";
import { brandClientSchema } from "@/features/catalog/schemas/brand";
import type { BrandListItem } from "@/features/catalog/types";
import { catalogApi } from "@/features/catalog/api/catalog-api-client";
import {
  AdminCheckboxField,
  AdminInputField,
} from "@/components/admin-form-field";
import { SortableDragHandle, SortableList, SortableListItem } from "@/components/sortable-list";

type Brand = BrandListItem;
const schema = brandClientSchema;
type Values = z.infer<typeof schema>;

function SortableBrandCard({
  item,
  disabled,
  pendingDeleteId,
  onEdit,
  onDelete,
}: {
  item: Brand;
  disabled: boolean;
  pendingDeleteId: string | null;
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
}) {
  return (
    <SortableListItem
      id={item.id}
      disabled={disabled}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <SortableDragHandle label={`Reorder ${item.name}`} disabled={disabled} />
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
          {item.logoUrl ? <img src={item.logoUrl} alt="" className="h-full w-full object-contain p-2" /> : <ImageIcon className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-black text-slate-950">{item.name}</h2>
          <p className="text-xs text-slate-500">{item.productCount} products</p>
        </div>
        <StatusBadge status={item.isActive ? "active" : "inactive"} />
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(item)} disabled={disabled}>
          <Pencil className="size-4" /> Edit
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={item.productCount > 0 || pendingDeleteId === item.id || disabled}
          title={item.productCount > 0 ? "Remove products from this brand before deleting." : "Delete brand"}
          aria-label={`Delete ${item.name}`}
          onClick={() => onDelete(item)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </SortableListItem>
  );
}

export function BrandManager({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [localBrands, setLocalBrands] = useState(brands);
  const [editing, setEditing] = useState<Brand | null | undefined>();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [isReordering, startReorder] = useTransition();
  const logoRef = useRef<HTMLInputElement>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  useEffect(() => setLocalBrands(brands), [brands]);
  const orderedBrands = useMemo(
    () => [...localBrands].sort((left, right) => left.position - right.position || left.name.localeCompare(right.name)),
    [localBrands],
  );
  const open = (item: Brand | null) => {
    setEditing(item);
    if (logoRef.current) logoRef.current.value = "";
    form.reset({
      name: item?.name ?? "",
      isActive: item?.isActive ?? true,
    });
  };
  const submit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    if (editing) payload.set("id", editing.id);
    Object.entries(values).forEach(([key, value]) => payload.set(key, String(value)));
    const logo = logoRef.current?.files?.[0];
    if (logo) payload.set("logo", logo);
    try {
      const result = editing
        ? await catalogApi.updateBrand<{ id: string }>(editing.id, payload)
        : await catalogApi.createBrand<{ id: string }>(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Brand saved.");
      setEditing(undefined);
      startRefresh(() => router.refresh());
    } catch (error) {
      console.error("Brand save request failed.", error);
      toast.error("Brand could not be saved.");
    }
  });
  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedBrands.findIndex((item) => item.id === active.id);
    const newIndex = orderedBrands.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const previous = localBrands;
    const reordered = arrayMove(orderedBrands, oldIndex, newIndex);
    const nextPositions = new Map(reordered.map((item, index) => [item.id, index]));
    setLocalBrands(previous.map((item) => ({ ...item, position: nextPositions.get(item.id) ?? item.position })));
    startReorder(async () => {
      const payload = new FormData();
      payload.set("brandIds", JSON.stringify(reordered.map((item) => item.id)));
      try {
        const result = await catalogApi.reorderBrands(payload);
        if (!result.success) {
          setLocalBrands(previous);
          toast.error(result.error);
          return;
        }
        toast.success("Brand order saved.");
      } catch (error) {
        console.error("Brand reorder request failed.", error);
        setLocalBrands(previous);
        toast.error("Brand order could not be saved.");
      }
    });
  };
  const deleteBrand = async (item: Brand) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    setPendingDeleteId(item.id);
    try {
      const result = await catalogApi.deleteBrand(item.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Brand deleted.");
      startRefresh(() => router.refresh());
    } catch (error) {
      console.error("Brand deletion request failed.", error);
      toast.error("Brand could not be deleted.");
    } finally {
      setPendingDeleteId(null);
    }
  };
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">Catalogue brands</h2>
          <p className="text-sm text-slate-500">Create manufacturer records before assigning them to products.</p>
        </div>
        <Button onClick={() => open(null)} disabled={isRefreshing || isReordering}>
          <Plus className="size-4" /> Add brand
        </Button>
      </div>
      <SortableList
        id="catalog-brand-order"
        itemIds={orderedBrands.map((item) => item.id)}
        strategy="rect"
        onDragEnd={onDragEnd}
        disabled={isRefreshing || isReordering}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {orderedBrands.map((item) => (
            <SortableBrandCard
              key={item.id}
              item={item}
              disabled={isRefreshing || isReordering}
              pendingDeleteId={pendingDeleteId}
              onEdit={open}
              onDelete={deleteBrand}
            />
          ))}
        </div>
      </SortableList>
      <Dialog open={editing !== undefined} onOpenChange={(value) => { if (!value) setEditing(undefined); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit brand" : "New brand"}</DialogTitle>
            <DialogDescription>Enter the brand name and upload its logo.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={submit} className="grid gap-4">
              <AdminInputField name="name" label="Name" />
              <div className="grid gap-2">
                <Label htmlFor="brand-logo">Brand logo</Label>
                <Input id="brand-logo" ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" />
                <p className="text-xs text-slate-500">JPEG, PNG, or WebP; 5 MiB maximum.</p>
              </div>
              <AdminCheckboxField name="isActive" label="Active" />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save brand"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
