// src/components/products/category-product-list.tsx
// Server Component - fetches category and products server-side
import { Suspense } from "react";
import { getCategoryPageDataServer } from "@/lib/serverApi";
import CategoryProductListClient from "./category-product-list-client";
import ProductCardSkeleton from "../ui/product-card-skeleton";
import AppBreadcrumb from "../common/app-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryProductListProps {
  categoryId: string;
}

// Skeleton for loading state
function CategoryProductListSkeleton() {
  return (
    <main className="min-h-screen bg-white">
      <div className="constrained-width pt-3 sm:pt-6">
        <AppBreadcrumb
          items={[
            { label: "HOME", href: "/" },
            { label: "PRODUCTS", href: "/products" },
            { label: "CATEGORY" },
          ]}
        />
      </div>
      <div className="constrained-width pt-2 sm:pt-3 pb-4 sm:pb-5">
        <div className="-ml-2 sm:-ml-4 mb-2 flex gap-3">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="flex items-center gap-3 sm:gap-4 mb-2">
          <Skeleton className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl" />
          <div className="space-y-2 w-full max-w-md">
            <Skeleton className="h-7 sm:h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
      <div className="constrained-width pt-0 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-3 xl:gap-4">
          <ProductCardSkeleton count={10} />
        </div>
      </div>
    </main>
  );
}

// Server Component wrapper - fetches data server-side
async function CategoryProductListContent({ categoryId }: CategoryProductListProps) {
  const data = await getCategoryPageDataServer(categoryId);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const products = data.products as any;
  
  return (
    <CategoryProductListClient
      categoryId={categoryId}
      category={data.category}
      initialProducts={products}
      totalCount={data.totalCount}
      totalPages={data.totalPages}
      brands={data.brands}
    />
  );
}

// Main export with Suspense boundary
export default function CategoryProductList({ categoryId }: CategoryProductListProps) {
  return (
    <Suspense fallback={<CategoryProductListSkeleton />}>
      <CategoryProductListContent categoryId={categoryId} />
    </Suspense>
  );
}
