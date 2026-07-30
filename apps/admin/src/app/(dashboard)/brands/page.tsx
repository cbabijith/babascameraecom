import { BrandManager } from "@/features/catalog/components/brand-manager";
import { getBrands } from "@/features/catalog/server/brands";

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  return <BrandManager brands={await getBrands()} />;
}
