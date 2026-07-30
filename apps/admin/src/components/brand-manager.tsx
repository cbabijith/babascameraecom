"use client";

/* eslint-disable @next/next/no-img-element -- Brand media uses administrator-defined runtime URLs. */

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Form, Input, Label, toast } from "@babascamera/ui";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { StatusBadge } from "@/components/status-badge";
import {
  AdminCheckboxField,
  AdminInputField,
  AdminTextareaField,
} from "@/components/admin-form-field";
import { deleteBrandAction, saveBrandAction } from "@/lib/actions/catalog";

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  productCount: number;
}
const schema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(1_000),
  logoUrl: z.string().refine((value) => value === "" || /^https?:\/\//.test(value)),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;

export function BrandManager({ brands }: { brands: Brand[] }) {
  const [editing, setEditing] = useState<Brand | null | undefined>();
  const logoRef = useRef<HTMLInputElement>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema) });
  const open = (item: Brand | null) => {
    setEditing(item);
    if (logoRef.current) logoRef.current.value = "";
    form.reset({
      name: item?.name ?? "", slug: item?.slug ?? "", description: item?.description ?? "",
      logoUrl: item?.logoUrl ?? "", isActive: item?.isActive ?? true,
    });
  };
  const submit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    if (editing) payload.set("id", editing.id);
    Object.entries(values).forEach(([key, value]) => payload.set(key, String(value)));
    const logo = logoRef.current?.files?.[0];
    if (logo) payload.set("logo", logo);
    try {
      const result = await saveBrandAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Brand saved.");
      setEditing(undefined);
    } catch (error) {
      console.error("Brand save request failed.", error);
      toast.error("Brand could not be saved.");
    }
  });
  return (
    <>
      <div className="flex justify-end"><Button onClick={() => open(null)}><Plus className="size-4" /> Add brand</Button></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {brands.map((item) => (
          <article key={item.id} className="rounded-2xl border bg-white p-5">
            <div className="flex items-start gap-4">
              {item.logoUrl ? <img src={item.logoUrl} alt="" className="size-14 rounded-xl object-contain" /> : <span className="size-14 rounded-xl bg-slate-100" />}
              <div className="min-w-0 flex-1"><h2 className="font-black">{item.name}</h2><p className="text-xs text-slate-500">/{item.slug} · {item.productCount} products</p></div>
              <StatusBadge status={item.isActive ? "active" : "inactive"} />
            </div>
            <p className="mt-4 line-clamp-2 text-sm text-slate-600">{item.description ?? "No description."}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => open(item)}><Pencil className="size-4" /> Edit</Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={item.productCount > 0}
                aria-label={`Delete ${item.name}`}
                onClick={async () => {
                  if (!window.confirm(`Delete ${item.name}?`)) return;
                  const payload = new FormData();
                  payload.set("id", item.id);
                  try {
                    const result = await deleteBrandAction(payload);
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Brand deleted.");
                  } catch (error) {
                    console.error("Brand deletion request failed.", error);
                    toast.error("Brand could not be deleted.");
                  }
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
      <Dialog open={editing !== undefined} onOpenChange={(value) => { if (!value) setEditing(undefined); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit brand" : "New brand"}</DialogTitle><DialogDescription>Maintain storefront manufacturer metadata.</DialogDescription></DialogHeader>
          <Form {...form}>
            <form onSubmit={submit} className="grid gap-4">
              <AdminInputField name="name" label="Name" />
              <AdminInputField name="slug" label="Slug" />
              <AdminInputField name="logoUrl" label="Logo URL" inputProps={{ type: "url" }} />
              <div className="grid gap-2">
                <Label htmlFor="brand-logo">Upload logo</Label>
                <Input id="brand-logo" ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" />
                <p className="text-xs text-slate-500">JPEG, PNG, or WebP; 5 MiB maximum. A new upload replaces the URL above.</p>
              </div>
              <AdminTextareaField name="description" label="Description" />
              <AdminCheckboxField name="isActive" label="Active" />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving…" : "Save brand"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
