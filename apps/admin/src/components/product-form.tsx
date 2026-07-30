"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  toast,
} from "@babascamera/ui";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import {
  AdminCheckboxField,
  AdminInputField,
  AdminSelectField,
  AdminTextareaField,
} from "@/components/admin-form-field";
import { RichTextEditor } from "@/components/rich-text-editor";
import { saveProductAction } from "@/lib/actions/catalog";

const money = /^\d+(?:\.\d{1,2})?$/;
function moneyMinor(value: string) {
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}
const schema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sku: z.string().trim().min(1).max(120),
  categoryId: z.string().uuid(),
  brandId: z.string().uuid(),
  shortDescription: z.string().max(400),
  description: z.string().max(50_000),
  mrp: z.string().regex(money),
  salePrice: z.string().regex(money),
  costPrice: z.string().refine((value) => value === "" || money.test(value)),
  stock: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative(),
  weight: z.string().refine((value) => value === "" || money.test(value)),
  metaTitle: z.string().max(180),
  metaDescription: z.string().max(400),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  variants: z.array(z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1),
    value: z.string().trim().min(1),
    sku: z.string().trim().min(1),
    additionalPrice: z.string().regex(money),
    stock: z.number().int().nonnegative(),
  })).max(100),
}).refine((value) => (
  money.test(value.salePrice) &&
  money.test(value.mrp) &&
  moneyMinor(value.salePrice) <= moneyMinor(value.mrp)
), {
  message: "Sale price cannot exceed MRP.",
  path: ["salePrice"],
});

type Values = z.infer<typeof schema>;

type InitialProduct = Partial<Omit<Values, "variants">> & {
  id?: string;
  variants?: Values["variants"];
};

export function ProductForm({
  product,
  categories,
  brands,
}: {
  product?: InitialProduct;
  categories: { id: string; name: string; isActive: boolean }[];
  brands: { id: string; name: string; isActive: boolean }[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      sku: product?.sku ?? "",
      categoryId: product?.categoryId ?? "",
      brandId: product?.brandId ?? "",
      shortDescription: product?.shortDescription ?? "",
      description: product?.description ?? "",
      mrp: product?.mrp ?? "",
      salePrice: product?.salePrice ?? "",
      costPrice: product?.costPrice ?? "",
      stock: product?.stock ?? 0,
      lowStockThreshold: product?.lowStockThreshold ?? 5,
      weight: product?.weight ?? "",
      metaTitle: product?.metaTitle ?? "",
      metaDescription: product?.metaDescription ?? "",
      isActive: product?.isActive ?? true,
      isFeatured: product?.isFeatured ?? false,
      variants: product?.variants ?? [],
    },
  });
  const variants = useFieldArray({ control: form.control, name: "variants" });
  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    if (product?.id) payload.set("id", product.id);
    for (const [key, value] of Object.entries(values)) {
      if (key === "variants") payload.set("variants", JSON.stringify(value));
      else if (typeof value === "boolean") payload.set(key, String(value));
      else payload.set(key, String(value ?? ""));
    }
    for (const file of fileRef.current?.files ?? []) payload.append("images", file);
    try {
      const result = await saveProductAction(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Product saved.");
      router.push(result.data.redirectTo);
      router.refresh();
    } catch (error) {
      console.error("Product save request failed.", error);
      toast.error("Product could not be saved.");
    }
  });

  return (
    <Form {...form}>
    <form onSubmit={onSubmit} className="grid gap-6">
      <Card>
        <CardHeader><CardTitle>Product information</CardTitle></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <AdminInputField name="name" label="Name" />
          <AdminInputField name="slug" label="Slug" />
          <AdminInputField name="sku" label="SKU" />
          <AdminSelectField name="categoryId" label="Category">
            <option value="">Select category</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? "" : " (inactive)"}</option>)}
          </AdminSelectField>
          <AdminSelectField name="brandId" label="Brand">
            <option value="">Select brand</option>
            {brands.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isActive ? "" : " (inactive)"}</option>)}
          </AdminSelectField>
          <AdminTextareaField name="shortDescription" label="Short description" className="md:col-span-2" />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Rich description</FormLabel>
                <RichTextEditor value={field.value} onChange={field.onChange} />
                <FormDescription>Saved HTML is sanitized with a strict public-safe allowlist.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Pricing, inventory, and media</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <AdminInputField name="mrp" label="MRP (₹)" inputProps={{ inputMode: "decimal" }} />
          <AdminInputField name="salePrice" label="Sale price (₹)" inputProps={{ inputMode: "decimal" }} />
          <AdminInputField name="costPrice" label="Cost price (₹)" inputProps={{ inputMode: "decimal" }} />
          <AdminInputField name="weight" label="Weight" inputProps={{ inputMode: "decimal" }} />
          <AdminInputField name="stock" label="Stock" valueAsNumber inputProps={{ type: "number", min: 0 }} />
          <AdminInputField name="lowStockThreshold" label="Low-stock threshold" valueAsNumber inputProps={{ type: "number", min: 0 }} />
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="product-images">Images</Label>
            <Input id="product-images" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple />
            <p className="text-xs text-slate-500">Upload up to six JPEG, PNG, or WebP images; maximum 5 MiB each.</p>
          </div>
          <AdminCheckboxField name="isActive" label="Active" />
          <AdminCheckboxField name="isFeatured" label="Featured" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between"><CardTitle>Variants</CardTitle><Button type="button" variant="outline" onClick={() => variants.append({ name: "", value: "", sku: "", additionalPrice: "0.00", stock: 0 })}><Plus className="size-4" /> Add variant</Button></CardHeader>
        <CardContent className="grid gap-3">
          {variants.fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
              <AdminInputField name={`variants.${index}.name`} label="Type" inputProps={{ placeholder: "e.g. Color" }} />
              <AdminInputField name={`variants.${index}.value`} label="Value" inputProps={{ placeholder: "e.g. Black" }} />
              <AdminInputField name={`variants.${index}.sku`} label="Variant SKU" />
              <AdminInputField name={`variants.${index}.additionalPrice`} label="Additional ₹" inputProps={{ inputMode: "decimal" }} />
              <AdminInputField name={`variants.${index}.stock`} label="Stock" valueAsNumber inputProps={{ type: "number", min: 0 }} />
              <Button type="button" variant="ghost" size="icon" onClick={() => variants.remove(index)}><Trash2 className="size-4" /></Button>
            </div>
          ))}
          {!variants.fields.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">This product has no variants.</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Search metadata</CardTitle></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <AdminInputField name="metaTitle" label="Meta title" />
          <AdminTextareaField name="metaDescription" label="Meta description" />
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving…" : "Save product"}</Button></div>
    </form>
    </Form>
  );
}
