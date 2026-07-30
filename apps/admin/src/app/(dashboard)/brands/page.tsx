import { PageHeader } from "@/components/page-header";
import { BrandManager } from "@/features/catalog/components/brand-manager";
import { getBrands } from "@/features/catalog/server/brands";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  return (
    <>
      <PageHeader title="Brands" description="Manage brand records and display priority." />
      <BrandManager brands={await getBrands()} />
    </>
  );
}
