// src/components/home/top-sellers.tsx
// Server Component - fetches popular products server-side
import { Suspense } from "react";
import { getPopularProductsServer } from "@/lib/serverApi";
import TopSellersClient from "./top-sellers-client";

// Skeleton for loading state
function TopSellersSkeleton() {
  return (
    <section className="py-0">
      <div className="constrained-width">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-xl sm:text-2xl lg:text-[28px] text-gray-900 font-[650]">
            Top Sellers
          </h2>
          <div className="hidden md:block h-10 w-[92px]" />
        </div>

        <div className="overflow-hidden">
          <div
            className="
              flex overflow-x-hidden gap-4 md:gap-5 pb-2
              [--gap:16px] md:[--gap:20px]
              [--cards:2.5] sm:[--cards:3.5] lg:[--cards:4.5]
            "
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="
                  flex-none
                  w-[calc((100%-(var(--gap)*(var(--cards)-1)))/var(--cards)+6px)]
                  md:w-[calc((100%-(var(--gap)*(var(--cards)-1)))/var(--cards))]
                "
              >
                <div
                  className="
                    rounded-[14px] md:rounded-[24px] border bg-white shadow-sm animate-pulse
                    h-[140px] md:h-[180px]
                  "
                />
                <div className="mt-2 md:mt-2 min-h-[96px] md:min-h-[94px]">
                  <div className="bg-gray-200 rounded animate-pulse h-[1.5em] mb-1" />
                  <div className="bg-gray-200 rounded animate-pulse h-[1.5em] mb-1 md:hidden" />
                  <div className="bg-gray-200 rounded animate-pulse h-[1.2em] w-[70%] mb-1" />
                  <div className="bg-gray-200 rounded animate-pulse h-[1.3em] w-[50%]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Server Component - fetches data server-side
async function TopSellersContent() {
  const products = await getPopularProductsServer(10);
  
  if (products.length === 0) {
    return null;
  }
  
  return <TopSellersClient products={products} />;
}

// Main export with Suspense boundary
export default function TopSellers() {
  return (
    <Suspense fallback={<TopSellersSkeleton />}>
      <TopSellersContent />
    </Suspense>
  );
}
