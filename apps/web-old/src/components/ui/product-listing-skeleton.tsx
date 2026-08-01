// src/components/common/product-listing-skeleton.tsx

import { Skeleton } from "@/components/ui/skeleton"
import ProductCardSkeleton from "./product-card-skeleton"

interface ProductListingSkeletonProps {
  variant?: 'grid' | 'horizontal-scroll' | 'category-sections'
  showHeader?: boolean
  showFilters?: boolean
  cardCount?: number
  categorySections?: number
  className?: string
}

const ProductListingSkeleton = ({ 
  variant = 'grid',
  showHeader = true,
  showFilters = false,
  cardCount = 8,
  categorySections = 3,
  className = ""
}: ProductListingSkeletonProps) => {
  
  // Grid Layout (for general product pages)
  if (variant === 'grid') {
    return (
      <div className={`min-h-screen bg-white ${className}`}>
        {/* Hero Banner Skeleton */}
        {/* {showHeader && (
          <div className="py-16 bg-white">
            <div className="constrained-width">
              <div className="relative w-full max-w-[1400px] h-[400px] mx-auto rounded-[32px] overflow-hidden">
                <Skeleton className="w-full h-full rounded-[32px]" />
              </div>
            </div>
          </div>
        )} */}

        <div className="constrained-width py-8">
          {/* Page Title Skeleton */}
          {showHeader && (
            <div className="mb-8">
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>
          )}

          {/* Filters Skeleton */}
          {showFilters && (
            <div className="mb-8 p-6 bg-[#F7F7F7] rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div>
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="w-8 h-8 rounded" />
                  <Skeleton className="w-8 h-8 rounded" />
                  <Skeleton className="w-20 h-6" />
                </div>
              </div>
            </div>
          )}

          {/* Product Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <ProductCardSkeleton count={cardCount} />
          </div>
        </div>
      </div>
    )
  }

  // Horizontal Scroll Layout (for category sections)
  if (variant === 'horizontal-scroll') {
    return (
      <div className={`space-y-12 ${className}`}>
        {Array.from({ length: categorySections }).map((_, sectionIndex) => (
          <section key={sectionIndex}>
            {/* Category Header Skeleton */}
            <div className="bg-[#F7F7F7] p-6 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div>
                    <Skeleton className="h-6 w-40 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="w-8 h-8 rounded" />
                  <Skeleton className="w-8 h-8 rounded" />
                  <Skeleton className="w-20 h-6" />
                </div>
              </div>
            </div>

            {/* Brand Filter Skeleton */}
            {showFilters && (
              <div className="flex items-center space-x-3 flex-wrap gap-y-2 mb-6">
                <Skeleton className="h-8 w-12 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-18 rounded-full" />
              </div>
            )}

            {/* Horizontal Product Cards Skeleton */}
            <div className="flex space-x-6 overflow-x-auto scrollbar-hide pb-4">
              <ProductCardSkeleton count={6} className="flex-shrink-0" />
            </div>
          </section>
        ))}
      </div>
    )
  }

  // Category Sections Layout (for main product page)
  if (variant === 'category-sections') {
    return (
      <main className={`min-h-screen bg-white ${className}`}>
        {/* Hero Banner Skeleton */}
        {/* {showHeader && (
          <div className="py-16 bg-white">
            <div className="constrained-width">
              <div className="relative w-full max-w-[1400px] h-[400px] mx-auto rounded-[32px] overflow-hidden">
                <Skeleton className="w-full h-full rounded-[32px]" />
              </div>
            </div>
          </div>
        )} */}

        <div className="constrained-width py-8">
          {/* Page Title Skeleton */}
          {showHeader && (
            <div className="mb-8">
              <Skeleton className="h-8 w-64 mb-2" />
            </div>
          )}

          {/* Category Sections Skeleton */}
          <ProductListingSkeleton 
            variant="horizontal-scroll" 
            showFilters={showFilters}
            categorySections={categorySections}
          />
        </div>
      </main>
    )
  }

  return null
}

export { ProductListingSkeleton as default }