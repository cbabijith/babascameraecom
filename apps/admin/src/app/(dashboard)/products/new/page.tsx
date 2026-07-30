import { PageHeader } from "@/components/page-header";
import { ProductForm } from "@/components/product-form";
import { getCatalogOptions } from "@/lib/data";

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
