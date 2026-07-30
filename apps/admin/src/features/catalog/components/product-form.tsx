"use client";

/* eslint-disable @next/next/no-img-element -- New-product previews use local object URLs before upload. */

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  cn,
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
import { Camera, ChevronDown, FileText, IndianRupee, Package, Plus, Save, Search, Truck, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { z } from "zod";

import {
  AdminCheckboxField,
  AdminInputField,
  AdminSearchSelectField,
  AdminTextareaField,
} from "@/components/admin-form-field";
import { productClientSchema } from "@/features/catalog/schemas/product";
import { ProductImageManager } from "@/features/catalog/components/product-image-manager";
import { catalogApi } from "@/features/catalog/api/catalog-api-client";

const schema = productClientSchema;
const RichTextEditor = dynamic(
  () => import("@/components/rich-text-editor").then((module) => module.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="min-h-40 rounded-md border border-slate-200 bg-slate-50" />,
  },
);

type Values = z.infer<typeof schema>;

type InitialProduct = Partial<Omit<Values, "variants">> & {
  id?: string;
  variants?: Values["variants"];
};

interface ProductFormImage {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
}

function productSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function ProductFormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-lg border border-slate-200 bg-white ${className ?? ""}`}>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="grid gap-5 p-5">
        {children}
      </div>
    </section>
  );
}

function CollapsibleProductSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 text-left hover:bg-slate-50/70"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="block text-base font-semibold leading-none tracking-tight">{title}</span>
          <span className="mt-1 block text-sm text-slate-500">{description}</span>
        </span>
        <ChevronDown className={cn("mt-1 size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? <div className="grid gap-5 p-5">{children}</div> : null}
    </section>
  );
}

export function ProductForm({
  product,
  categories,
  brands,
  images = [],
}: {
  product?: InitialProduct;
  categories: { id: string; name: string; isActive: boolean; parentId?: string | null; sortOrder?: number }[];
  brands: { id: string; name: string; isActive: boolean }[];
  images?: ProductFormImage[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const selectedFilePreviews = useMemo(
    () => selectedFiles.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [selectedFiles],
  );
  useEffect(
    () => () => {
      selectedFilePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    },
    [selectedFilePreviews],
  );
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
      costPrice: "",
      gstRate: product?.gstRate ?? "",
      priceIncludesGst: product?.priceIncludesGst ?? true,
      stock: product?.stock ?? 0,
      lowStockThreshold: product?.lowStockThreshold ?? 5,
      weight: product?.weight ?? "",
      shippingFee: product?.shippingFee ?? "",
      warranty: product?.warranty ?? "",
      youtubeUrl: product?.youtubeUrl ?? "",
      metaTitle: product?.metaTitle ?? "",
      metaDescription: product?.metaDescription ?? "",
      isActive: product?.isActive ?? true,
      isFeatured: product?.isFeatured ?? false,
      variants: product?.variants ?? [],
    },
  });
  const variants = useFieldArray({ control: form.control, name: "variants" });
  const categoryOptions = useMemo(() => {
    const rows: (typeof categories[number] & { depth: number })[] = [];
    const visit = (parentId: string | null, depth: number, lineage: Set<string>) => {
      const children = categories
        .filter((item) => (item.parentId ?? null) === parentId)
        .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0) || left.name.localeCompare(right.name));
      for (const item of children) {
        if (lineage.has(item.id)) continue;
        rows.push({ ...item, depth });
        visit(item.id, depth + 1, new Set([...lineage, item.id]));
      }
    };
    visit(null, 0, new Set());
    for (const item of categories) {
      if (!rows.some((row) => row.id === item.id)) rows.push({ ...item, depth: 0 });
    }
    return rows.map((item) => ({
      value: item.id,
      label: `${item.depth ? `${"  ".repeat(item.depth)}↳ ` : ""}${item.name}`,
      description: item.depth ? `Level ${item.depth + 1} category` : "Top-level category",
      ...(item.isActive ? {} : { badge: "inactive" }),
    }));
  }, [categories]);
  const brandOptions = useMemo(() => brands.map((item) => ({
    value: item.id,
    label: item.name,
    description: item.isActive ? "Brand record" : "Inactive brand",
    ...(item.isActive ? {} : { badge: "inactive" }),
  })), [brands]);
  const watchedName = form.watch("name");
  useEffect(() => {
    const slugState = form.getFieldState("slug");
    const currentSlug = form.getValues("slug");
    if (!slugState.isDirty) {
      form.setValue("slug", productSlug(watchedName), {
        shouldDirty: false,
        shouldValidate: Boolean(currentSlug),
      });
    }
  }, [form, watchedName]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload = new FormData();
    if (product?.id) payload.set("id", product.id);
    for (const [key, value] of Object.entries(values)) {
      if (key === "variants") payload.set("variants", JSON.stringify(value));
      else if (typeof value === "boolean") payload.set(key, String(value));
      else payload.set(key, String(value ?? ""));
    }
    for (const file of selectedFiles) payload.append("images", file);
    try {
      const productId = product?.id;
      const result = productId
        ? await catalogApi.updateProduct<{ id: string; redirectTo: string }>(productId, payload)
        : await catalogApi.createProduct<{ id: string; redirectTo: string }>(payload);
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
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="sticky top-0 z-20 -mx-1 border-b bg-slate-50/95 px-1 py-3 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">{product?.id ? "Edit product" : "Create product"}</p>
            <p className="truncate text-xs text-slate-500">{watchedName || "Enter product details, pricing, inventory, and SEO."}</p>
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            <Save className="size-4" /> {form.formState.isSubmitting ? "Saving..." : "Save product"}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="grid gap-5">
          <ProductFormSection
            title="Product Basics"
            description="Name, photos, optional SKU, category, brand, and publishing controls."
            icon={Camera}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <AdminInputField name="name" label="Product name" />
              <AdminInputField
                name="sku"
                label="SKU (optional)"
                description="Leave blank to generate an internal SKU automatically."
              />
            </div>
            {product?.id ? (
              <ProductImageManager productId={product.id} productName={watchedName || product.name || "Product"} images={images} />
            ) : (
              <div className="grid gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
                <Label htmlFor="product-images">Product images</Label>
                <Input
                  id="product-images"
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
                />
                {selectedFilePreviews.length ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {selectedFilePreviews.map((preview, index) => (
                      <div key={`${preview.file.name}-${index}`} className="overflow-hidden rounded-md border border-slate-200 bg-white">
                        <img src={preview.url} alt="" className="aspect-square w-full object-cover" />
                        <div className="flex items-center justify-between gap-2 p-2">
                          <span className="truncate text-xs text-slate-500">{preview.file.name}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove ${preview.file.name}`}
                            onClick={() => {
                              setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
                              if (fileRef.current) fileRef.current.value = "";
                            }}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="text-xs text-slate-500">Optional. Upload initial images now, or add images after saving.</p>
              </div>
            )}
            <div className="grid gap-5 lg:grid-cols-2">
              <AdminSearchSelectField
                name="categoryId"
                label="Category"
                placeholder="Select category"
                searchPlaceholder="Search categories..."
                options={categoryOptions}
                emptyLabel="No categories match your search."
                description="Required. Products appear under this catalogue category."
              />
              <AdminSearchSelectField
                name="brandId"
                label="Brand"
                placeholder="Select brand"
                searchPlaceholder="Search brands..."
                options={brandOptions}
                allowEmpty
                emptyValueLabel="No brand"
                emptyLabel="No brands match your search."
                description="Optional for house-branded or unbranded products."
              />
            </div>
            <div className="grid gap-4 rounded-lg border bg-slate-50 p-4 sm:grid-cols-2">
              <AdminCheckboxField name="isActive" label="Active" description="Visible to customers when category rules allow it." />
              <AdminCheckboxField name="isFeatured" label="Featured" description="Eligible for highlighted product placements." />
            </div>
          </ProductFormSection>

          <ProductFormSection
            title="Inventory"
            description="Quantity first, then optional low-stock and variant controls."
            icon={Package}
          >
          <div className="grid gap-5 sm:grid-cols-2">
            <AdminInputField name="stock" label="Stock" valueAsNumber inputProps={{ type: "number", min: 0 }} />
            <AdminInputField name="lowStockThreshold" label="Low-stock threshold" valueAsNumber inputProps={{ type: "number", min: 0 }} />
          </div>
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <div>
              <p className="text-sm font-bold text-slate-950">Variants</p>
              <p className="text-xs text-slate-500">Add options like color, kit, storage, or condition.</p>
            </div>
            <Button type="button" variant="outline" onClick={() => variants.append({ name: "", value: "", sku: "", additionalPrice: "0.00", stock: 0 })}>
              <Plus className="size-4" /> Add variant
            </Button>
          </div>
          <div className="grid gap-3">
            {variants.fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-lg border bg-slate-50 p-3 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
                <AdminInputField name={`variants.${index}.name`} label="Type" inputProps={{ placeholder: "e.g. Color" }} />
                <AdminInputField name={`variants.${index}.value`} label="Value" inputProps={{ placeholder: "e.g. Black" }} />
                <AdminInputField name={`variants.${index}.sku`} label="Variant SKU" />
                <AdminInputField name={`variants.${index}.additionalPrice`} label="Additional INR" inputProps={{ inputMode: "decimal" }} />
                <AdminInputField name={`variants.${index}.stock`} label="Stock" valueAsNumber inputProps={{ type: "number", min: 0 }} />
                <Button type="button" variant="ghost" size="icon" onClick={() => variants.remove(index)}><Trash2 className="size-4" /></Button>
              </div>
            ))}
            {!variants.fields.length ? <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">This product has no variants.</p> : null}
          </div>
          </ProductFormSection>

          <ProductFormSection
            title="Description"
            description="Optional customer-facing description and video reference."
            icon={FileText}
          >
          <AdminTextareaField name="shortDescription" label="Short description" textareaProps={{ rows: 3 }} />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rich description</FormLabel>
                <RichTextEditor value={field.value} onChange={field.onChange} />
                <FormDescription>Saved HTML is sanitized with a strict public-safe allowlist.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <AdminInputField
            name="youtubeUrl"
            label="YouTube link"
            inputProps={{ type: "url", placeholder: "https://www.youtube.com/watch?v=..." }}
            description="Optional product demo or review video."
          />
          </ProductFormSection>
        </div>

        <aside className="grid content-start gap-5">
          <ProductFormSection
            title="Pricing & Tax"
            description="Required selling price and optional tax metadata."
            icon={IndianRupee}
          >
          <AdminInputField name="mrp" label="MRP (INR)" inputProps={{ inputMode: "decimal" }} />
          <AdminInputField name="salePrice" label="Sale price (INR)" inputProps={{ inputMode: "decimal" }} />
          <AdminInputField name="gstRate" label="GST (%)" inputProps={{ inputMode: "decimal", placeholder: "18" }} />
          <AdminCheckboxField
            name="priceIncludesGst"
            label="Price includes GST"
            description="Turn off when sale price is tax-exclusive."
          />
          </ProductFormSection>

          <CollapsibleProductSection
            title="Shipping & Warranty"
            description="Optional fulfilment details."
            icon={Truck}
          >
          <AdminInputField name="weight" label="Weight" inputProps={{ inputMode: "decimal", placeholder: "0.50" }} />
          <AdminInputField name="shippingFee" label="Shipping fee (INR)" inputProps={{ inputMode: "decimal", placeholder: "0.00" }} />
          <AdminTextareaField
            name="warranty"
            label="Warranty"
            textareaProps={{ rows: 3, placeholder: "Example: 2-year manufacturer warranty." }}
          />
          </CollapsibleProductSection>

          <CollapsibleProductSection
            title="SEO"
            description="Optional search metadata."
            icon={Search}
          >
          <AdminInputField
            name="slug"
            label="Slug"
            description="Generated from the product name until you type a custom slug."
          />
          <AdminInputField name="metaTitle" label="Meta title" />
          <AdminTextareaField name="metaDescription" label="Meta description" />
          </CollapsibleProductSection>
        </aside>
      </div>
    </form>
    </Form>
  );
}
