import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/features/catalog/components/product-form";
import { getCatalogOptions } from "@/features/catalog/server/products";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const options = await getCatalogOptions();
  return (
    <>
      <PageHeader title="New product" description="Create a product, variants, and validated media." />
      <ProductForm {...options} />
    </>
  );
}
