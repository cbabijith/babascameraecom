// src/components/products/banner-products.tsx
// Server Component - fetches banner data server-side
import { Suspense } from "react";
import { getBannerDataServer } from "@/lib/serverApi";
import BannerProductsClient from "./banner-products-client";
import { ProductBannerSkeleton } from "@/components/ui/banner-skeleton";
import ProductCardSkeleton from "@/components/ui/product-card-skeleton";
import AppBreadcrumb from "../common/app-breadcrumb";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface BannerProductsProps {
  bannerId: string;
}

// Skeleton for loading state
function BannerProductsSkeleton() {
  return (
    <main className="min-h-screen bg-white">
      <div className="constrained-width pt-3 sm:pt-6">
        <AppBreadcrumb
          items={[
            { label: "HOME", href: "/" },
            { label: "PRODUCTS", href: "/products" },
            { label: "BANNER" },
          ]}
        />
      </div>
      <div className="py-4 sm:py-6 bg-white">
        <div className="constrained-width">
          <div className="relative w-full h-[200px] sm:h-[260px] md:h-[320px] lg:h-[380px] rounded-[16px] sm:rounded-[24px] lg:rounded-[32px] overflow-hidden">
            <ProductBannerSkeleton className="w-full h-full" />
          </div>
          <div className="mt-4 sm:mt-6 mb-4 sm:mb-6">
            <div className="h-7 w-64 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-40 bg-gray-200 rounded" />
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <ProductCardSkeleton count={8} />
          </div>
        </div>
      </div>
    </main>
  );
}

// Server Component wrapper - fetches data server-side
async function BannerProductsContent({ bannerId }: BannerProductsProps) {
  const { banner, products: rawProducts } = await getBannerDataServer(bannerId);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = rawProducts as any;
  
  if (!banner) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Banner Not Found</h1>
          <p className="text-gray-600 mb-4">The requested banner could not be found.</p>
          <Link href="/products">
            <Button>Back to Products</Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <BannerProductsClient
      banner={banner}
      products={products}
    />
  );
}

// Main export with Suspense boundary
export default function BannerProducts({ bannerId }: BannerProductsProps) {
  return (
    <Suspense fallback={<BannerProductsSkeleton />}>
      <BannerProductsContent bannerId={bannerId} />
    </Suspense>
  );
}
