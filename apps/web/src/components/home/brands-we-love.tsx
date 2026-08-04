// src/components/home/brands-we-love.tsx
// Server Component - fetches brands data server-side
import { Suspense } from "react";
import { getActiveBrandsWithProductsServer } from "@/lib/serverApi";
import BrandsWeLoveClient from "./brands-we-love-client";

// Skeleton for loading state
function BrandsWeLoveSkeleton() {
  return (
    <section className="py-0">
      <div className="constrained-width">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-xl sm:text-2xl lg:text-[28px] font-[650] text-gray-900">
            Brands We Love
          </h2>
          <div className="hidden md:block h-10 w-[92px]" />
        </div>

        <div className="flex gap-3 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex-none w-[130px] sm:w-[190px] md:w-[230px] lg:w-[285px]
                h-[170px] md:h-[260px] lg:h-[300px]
                rounded-[16px] md:rounded-[28px] lg:rounded-[36px]
                border border-gray-200 bg-white shadow-sm animate-pulse"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// Server Component - fetches data server-side
async function BrandsWeLoveContent() {
  const brands = await getActiveBrandsWithProductsServer();

  if (brands.length === 0) {
    return null;
  }

  return <BrandsWeLoveClient brands={brands} />;
}

// Main export with Suspense boundary
export default function BrandsWeLove() {
  return (
    <Suspense fallback={<BrandsWeLoveSkeleton />}>
      <BrandsWeLoveContent />
    </Suspense>
  );
}
