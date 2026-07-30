import { Archive, ArrowLeft, ImagePlus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/products/product-form";
import { VariantForm } from "@/components/products/variant-form";
import { FlashMessage } from "@/components/ui/flash-message";
import { Field, inputClassName } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  archiveProductAction,
  removeProductMediaAction,
  uploadProductMediaAction,
} from "@/lib/actions/catalog";
import { getCatalogLookups, getProduct } from "@/lib/data/admin-queries";
import type { ProductSummary } from "@/lib/data/types";
import { formatMoney } from "@/lib/utils";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const [{ id }, query, brands, categories] = await Promise.all([
    params,
    searchParams,
    getCatalogLookups("brands"),
    getCatalogLookups("categories"),
  ]);
  const { product, variants, media } = await getProduct(id);
  if (!product) notFound();

  return (
    <div className="grid gap-6">
      <Link
        href="/products"
        className="inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="size-4" />
        Back to products
      </Link>
      <PageHeader
        eyebrow={product.code}
        title={product.name}
        description="Edit catalogue details and maintain sellable variants."
        action={
          <div className="flex gap-2">
            <StatusBadge status={product.status} />
            <StatusBadge status={product.visibility} />
          </div>
        }
      />
      <FlashMessage success={query.success} error={query.error} />
      <ProductForm
        mode="edit"
        product={product as unknown as ProductSummary}
        brands={brands}
        categories={categories}
      />

      <Panel>
        <PanelHeader
          title="Product images"
          description="Upload public catalogue images. Lower positions appear first on the storefront."
          action={
            <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
              <ImagePlus className="size-3.5" />
              {media.length} image{media.length === 1 ? "" : "s"}
            </span>
          }
        />
        {media.length ? (
          <div className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-2 xl:grid-cols-4">
            {media.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div
                  role="img"
                  aria-label={item.alt_text ?? product.name}
                  className="aspect-square bg-slate-100 bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${item.publicUrl}")` }}
                />
                <div className="flex items-center justify-between gap-3 p-3">
                  <span className="min-w-0 text-xs font-bold text-slate-600">
                    <span className="block truncate">
                      {item.alt_text ?? product.name}
                    </span>
                    <span className="mt-1 block text-slate-400">
                      Position {item.position}
                    </span>
                  </span>
                  <form action={removeProductMediaAction}>
                    <input type="hidden" name="product_id" value={id} />
                    <input
                      type="hidden"
                      name="product_media_id"
                      value={item.id}
                    />
                    <SubmitButton
                      variant="danger"
                      pendingLabel="Removing..."
                      className="min-h-9 px-3"
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Remove image</span>
                    </SubmitButton>
                  </form>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        <form
          action={uploadProductMediaAction}
          className="grid gap-4 p-5 md:grid-cols-[minmax(16rem,1fr)_minmax(12rem,1fr)_8rem_auto]"
        >
          <input type="hidden" name="product_id" value={id} />
          <Field
            label="Image"
            hint="JPEG, PNG, WebP, or AVIF. Maximum 10 MB."
          >
            <input
              className={inputClassName}
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              required
            />
          </Field>
          <Field label="Alternative text">
            <input
              className={inputClassName}
              name="alt_text"
              maxLength={180}
              defaultValue={product.name}
            />
          </Field>
          <Field label="Position">
            <input
              className={inputClassName}
              type="number"
              name="position"
              min={0}
              max={100000}
              defaultValue={media.length}
            />
          </Field>
          <div className="flex items-end">
            <SubmitButton pendingLabel="Uploading...">
              <ImagePlus className="size-4" />
              Upload image
            </SubmitButton>
          </div>
        </form>
      </Panel>

      <Panel>
        <PanelHeader
          title="Variants"
          description="Each SKU carries independent price, tax, and sellability."
          action={
            <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
              <Plus className="size-3.5" />
              {variants.length} variant{variants.length === 1 ? "" : "s"}
            </span>
          }
        />
        <div className="divide-y divide-slate-100">
          {variants.map((variant) => (
            <details key={variant.id} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                <span>
                  <span className="block font-extrabold text-slate-950">{variant.sku}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {formatMoney(variant.price_minor)}
                    {variant.color_label ? ` · ${variant.color_label}` : ""}
                  </span>
                </span>
                <span className="flex gap-2">
                  {variant.is_default ? <StatusBadge status="default" tone="warning" /> : null}
                  <StatusBadge status={variant.is_active ? "active" : "inactive"} />
                </span>
              </summary>
              <div className="border-t border-slate-100 bg-slate-50/40">
                <VariantForm productId={id} variant={variant} />
              </div>
            </details>
          ))}
          <details>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-extrabold text-amber-700 hover:bg-amber-50">
              <Plus className="size-4" />
              Add another variant
            </summary>
            <div className="border-t border-slate-100 bg-slate-50/40">
              <VariantForm productId={id} />
            </div>
          </details>
        </div>
      </Panel>

      {product.status !== "archived" ? (
        <Panel className="border-rose-200">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-extrabold text-slate-950">Archive product</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Hides it from the storefront while preserving orders and audit history.
              </p>
            </div>
            <form action={archiveProductAction}>
              <input type="hidden" name="id" value={id} />
              <SubmitButton variant="danger" pendingLabel="Archiving…">
                <Archive className="size-4" />
                Archive
              </SubmitButton>
            </form>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
