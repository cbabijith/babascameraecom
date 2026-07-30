"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Form, Input, Label, toast } from "@babascamera/ui";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions/catalog";
import {
  AdminCheckboxField,
  AdminInputField,
  AdminSelectField,
  AdminTextareaField,
} from "@/components/admin-form-field";
import { StatusBadge } from "@/components/status-badge";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  isActive: boolean;
  productCount: number;
}

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(1_000),
  imageUrl: z.string().refine((value) => value === "" || /^https?:\/\//.test(value)),
  parentId: z.string(),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

function treeOrder(items: Category[]) {
  const rows: (Category & { depth: number })[] = [];
  const visit = (parentId: string | null, depth: number, lineage: Set<string>) => {
    for (const item of items.filter((candidate) => candidate.parentId === parentId)) {
      if (lineage.has(item.id)) continue;
      rows.push({ ...item, depth });
      visit(item.id, depth + 1, new Set([...lineage, item.id]));
    }
  };
  visit(null, 0, new Set());
  for (const orphan of items) if (!rows.some((row) => row.id === orphan.id)) rows.push({ ...orphan, depth: 0 });
  return rows;
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const imageRef = useRef<HTMLInputElement>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const open = (item: Category | null) => {
    setEditing(item);
    if (imageRef.current) imageRef.current.value = "";
    form.reset({
      name: item?.name ?? "",
      slug: item?.slug ?? "",
      description: item?.description ?? "",
      imageUrl: item?.imageUrl ?? "",
      parentId: item?.parentId ?? "",
      isActive: item?.isActive ?? true,
    });
  };
  const submit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    if (editing) payload.set("id", editing.id);
    Object.entries(values).forEach(([key, value]) => payload.set(key, String(value)));
    const image = imageRef.current?.files?.[0];
    if (image) payload.set("image", image);
    try {
      const result = await saveCategoryAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Category saved.");
      setEditing(undefined);
    } catch (error) {
      console.error("Category save request failed.", error);
      toast.error("Category could not be saved.");
    }
  });
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => open(null)}><Plus className="size-4" /> Add category</Button></div>
      <div className="overflow-hidden rounded-2xl border bg-white">
        {treeOrder(categories).map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-3 border-b p-4 last:border-0">
            <div className="min-w-56 flex-1" style={{ paddingLeft: `${item.depth * 24}px` }}>
              <p className="font-bold">{item.depth ? "↳ " : ""}{item.name}</p>
              <p className="text-xs text-slate-500">/{item.slug} · {item.productCount} products</p>
            </div>
            <StatusBadge status={item.isActive ? "active" : "inactive"} />
            <Button variant="outline" size="sm" onClick={() => open(item)}><Pencil className="size-4" /> Edit</Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Delete ${item.name}`}
              disabled={item.productCount > 0}
              onClick={async () => {
                if (!window.confirm(`Delete ${item.name}? Child categories will move to the top level.`)) return;
                const payload = new FormData();
                payload.set("id", item.id);
                try {
                  const result = await deleteCategoryAction(payload);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("Category deleted.");
                } catch (error) {
                  console.error("Category deletion request failed.", error);
                  toast.error("Category could not be deleted.");
                }
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {!categories.length ? <p className="p-10 text-center text-slate-500">No categories yet.</p> : null}
      </div>
      <Dialog open={editing !== undefined} onOpenChange={(isOpen) => { if (!isOpen) setEditing(undefined); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle><DialogDescription>Organize products into a safe parent-child hierarchy.</DialogDescription></DialogHeader>
          <Form {...form}>
            <form onSubmit={submit} className="grid gap-4">
              <AdminInputField name="name" label="Name" />
              <AdminInputField name="slug" label="Slug" />
              <AdminSelectField name="parentId" label="Parent">
                <option value="">Top level</option>
                {categories.filter((item) => item.id !== editing?.id).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </AdminSelectField>
              <AdminInputField name="imageUrl" label="Image URL" inputProps={{ type: "url" }} />
              <div className="grid gap-2">
                <Label htmlFor="category-image">Upload image</Label>
                <Input id="category-image" ref={imageRef} type="file" accept="image/jpeg,image/png,image/webp" />
                <p className="text-xs text-slate-500">JPEG, PNG, or WebP; 5 MiB maximum. A new upload replaces the URL above.</p>
              </div>
              <AdminTextareaField name="description" label="Description" />
              <AdminCheckboxField name="isActive" label="Active" />
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Save category"}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
