// src/components/home/categories.tsx
// Server Component - fetches category data server-side for LCP optimization
import { Suspense } from "react";
import { getCategoriesServer } from "@/lib/serverApi";
import CategoriesClient from "./categories-client";

// Skeleton component for loading state
function CategoriesSkeleton() {
  const Grid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-7 gap-5 md:gap-5 lg:gap-6">
      {children}
    </div>
  );

  return (
    <section className="pt-8 sm:pt-6 lg:pt-6">
      <div className="constrained-width">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
          Categories
        </h2>
        <Grid>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="relative w-full aspect-square rounded-4xl bg-gray-200 animate-pulse mb-2 sm:mb-3" />
              <div className="h-3 sm:h-4 bg-gray-200 animate-pulse w-16 sm:w-20 rounded" />
            </div>
          ))}
        </Grid>
      </div>
    </section>
  );
}

// Server Component wrapper - fetches data server-side
async function CategoriesContent() {
  const categories = await getCategoriesServer();
  
  // If no categories, render nothing
  if (categories.length === 0) {
    return null;
  }
  
  // Pass pre-fetched data to client component for interactivity
  return <CategoriesClient categories={categories} />;
}

// Main export with Suspense boundary
export default function Categories() {
  return (
    <Suspense fallback={<CategoriesSkeleton />}>
      <CategoriesContent />
    </Suspense>
  );
}
