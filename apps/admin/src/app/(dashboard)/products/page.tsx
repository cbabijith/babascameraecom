import { PageHeader } from "@/components/page-header";
import { ProductTable } from "@/components/product-table";
import { getProducts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  return (
    <>
      <PageHeader title="Products" description="Manage catalogue, variants, images, prices, and inventory." action={{ href: "/products/new", label: "Add product" }} />
      <ProductTable data={await getProducts()} />
    </>
  );
}
