// src/components/common/product-card-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

interface ProductCardSkeletonProps {
  count?: number
  className?: string
}

const ProductCardSkeleton = ({
  count = 1,
  className = "",
}: ProductCardSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`
            group relative bg-white rounded-lg
            p-2 sm:p-3
            w-[160px] md:w-[285px]
            min-h-[360px] md:min-h-[400px]
            flex-shrink-0
            ${className}
          `}
        >
          {/* Wishlist button */}
          <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-10">
            <Skeleton className="w-6 h-6 sm:w-8 sm:h-8 rounded-full" />
          </div>

          {/* Image area */}
          <div
            className="
              relative border border-gray-200 overflow-hidden bg-gray-50
              rounded-[14px] md:rounded-3xl
              w-full
              h-[90.8537px] md:h-[200px]
              mb-1 sm:mb-3
            "
          >
            <Skeleton className="w-full h-full" />
          </div>

          {/* Text & actions */}
          <div className="mt-0.5">
            {/* Name */}
            <Skeleton className="h-4 sm:h-5 w-3/4 mb-1 sm:mb-2" />
            {/* Category */}
            <Skeleton className="h-3 sm:h-4 w-1/3 mb-1 sm:mb-2" />
            {/* Features */}
            <div className="space-y-1 sm:space-y-2 mb-2">
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            {/* Price row */}
            <div className="flex items-center gap-2 mt-2">
              <Skeleton className="h-5 sm:h-6 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            {/* Button */}
            <Skeleton className="mt-1.5 h-8 sm:h-9 w-full rounded-full" />
          </div>
        </div>
      ))}
    </>
  )
}

export { ProductCardSkeleton as default }
