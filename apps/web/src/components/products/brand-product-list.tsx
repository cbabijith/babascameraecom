// src/components/products/brand-product-list.tsx
// Server Component - fetches brand and products server-side
import { Suspense } from "react";
import { getBrandPageDataServer } from "@/lib/serverApi";
import BrandProductListClient from "./brand-product-list-client";
import ProductListingSkeleton from "../ui/product-listing-skeleton";

interface BrandProductListProps {
  brandId: string;
  page?: number;
}

// Server Component wrapper - fetches data server-side
async function BrandProductListContent({ brandId }: BrandProductListProps) {
  const data = await getBrandPageDataServer(brandId);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = data.products as any;
  
  return (
    <BrandProductListClient
      brandId={brandId}
      brand={data.brand}
      initialProducts={products}
      totalCount={data.totalCount}
      totalPages={data.totalPages}
    />
  );
}

// Main export with Suspense boundary
export default function BrandProductList({ brandId, page: _page }: BrandProductListProps) {
  return (
    <Suspense fallback={<ProductListingSkeleton variant="grid" showHeader={false} cardCount={12} />}>
      <BrandProductListContent brandId={brandId} />
    </Suspense>
  );
}
