import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { ProductForm } from "@/components/products/product-form";
import { FlashMessage } from "@/components/ui/flash-message";
import { PageHeader } from "@/components/ui/page-header";
import { getCatalogLookups } from "@/lib/data/admin-queries";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, brands, categories] = await Promise.all([
    searchParams,
    getCatalogLookups("brands"),
    getCatalogLookups("categories"),
  ]);

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
        eyebrow="New catalogue item"
        title="Create product"
        description="The product and its first sellable variant are created in one database transaction."
      />
      <FlashMessage error={params.error} />
      <ProductForm mode="create" brands={brands} categories={categories} />
    </div>
  );
}
