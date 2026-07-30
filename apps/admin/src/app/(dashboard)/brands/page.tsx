import { BrandManager } from "@/components/brand-manager";
import { PageHeader } from "@/components/page-header";
import { getBrands } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  return (
    <>
      <PageHeader title="Brands" description="Manage manufacturer identity and catalogue availability." />
      <BrandManager brands={await getBrands()} />
    </>
  );
}
