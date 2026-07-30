"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

interface BannerSkeletonProps {
  className?: string
  height?: string
  showContent?: boolean
  rounded?: string
}

export function BannerSkeleton({ 
  className, 
  height = "h-[317px]", 
  showContent = true,
  rounded = "rounded-[32px]"
}: BannerSkeletonProps) {
  return (
    <div className={cn("relative overflow-hidden", height, rounded, className)}>
      {/* Background skeleton */}
      <Skeleton className="absolute inset-0" />
      
      {showContent && (
        <div className="absolute inset-0 flex flex-col justify-between p-8">
          {/* Logo placeholder */}
          <div className="flex justify-start">
            <Skeleton className="w-20 h-10" />
          </div>
          
          {/* Title placeholder */}
          <div className="space-y-2">
            <Skeleton className="w-32 h-6" />
            <Skeleton className="w-24 h-4" />
          </div>
        </div>
      )}
    </div>
  )
}

// Hero banner skeleton
export function HeroBannerSkeleton({ className }: { className?: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-[28px] mt-10 sm:mt-14 lg:mt-16">
      <BannerSkeleton 
        className={className}
        height="h-[240px] sm:h-[320px] md:h-[420px] lg:h-[460px]"
        rounded="rounded-[28px]"
        showContent={true}
      />
    </div>
  )
}


// Section banner skeleton (for banner-section)
export function SectionBannerSkeleton({ className }: { className?: string }) {
  return (
    <BannerSkeleton 
      className={className}
      height="h-[317px]"
      rounded="rounded-[32px]"
      showContent={true}
    />
  )
}

// Product banner skeleton (for banner products page)
export function ProductBannerSkeleton({ className }: { className?: string }) {
  return (
    <BannerSkeleton 
      className={className}
      height="h-[300px]"
      rounded="rounded-[32px]"
      showContent={false}
    />
  )
}