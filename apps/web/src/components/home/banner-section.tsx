// src/components/home/banner-section.tsx
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { OptimizedMedia } from "@/components/ui/optimized-media"
import { SectionBannerSkeleton } from "@/components/ui/banner-skeleton"
import { getFeaturedBannersCombined } from "@/instances/bannerInstance"
import type { Banner } from "@/types/banner"
import { getImageUrl } from "@/lib/apiClient"

export default function BannerSection() {
  const [primaryBanner, setPrimaryBanner] = useState<Banner | null>(null)
  const [secondaryBanner, setSecondaryBanner] = useState<Banner | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedBanners = async () => {
      try {
        setLoading(true)
        const { primary, secondary } = await getFeaturedBannersCombined()
        setPrimaryBanner(primary)
        setSecondaryBanner(secondary)
      } catch (err) {
        console.error("Error fetching featured banners:", err)
        setPrimaryBanner(null)
        setSecondaryBanner(null)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedBanners()
  }, [])

  // Loading skeletons (keep as before)
  if (loading) {
    return (
      <section className="py-6">
        <div className="constrained-width">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SectionBannerSkeleton />
            <SectionBannerSkeleton />
          </div>
        </div>
      </section>
    )
  }

  // Compute availability
  const available: Banner[] = [primaryBanner, secondaryBanner].filter(Boolean) as Banner[]

  // If both are missing → completely hide this section
  if (available.length === 0) return null

  const Card = ({
    banner,
    gradient = "bg-black/30 group-hover:bg-black/40",
  }: {
    banner: Banner
    gradient?: string
  }) => {
    const src = banner.mediaFile?.key ? getImageUrl(banner.mediaFile.key) : ""
    const keyLower = (banner.mediaFile?.key || "").toLowerCase()
    const isVideo =
      Boolean(banner.mediaFile?.mimetype?.startsWith("video/")) ||
      [".mp4", ".webm", ".ogg", ".mov", ".m4v", ".avi", ".mkv"].some((ext) => keyLower.endsWith(ext))

    return (
      <Link href={`/products/banner/${banner._id}`} className="block group" aria-label={banner.subHeading}>
        <div
          className="
            relative overflow-hidden
            h-[200px] sm:h-[240px] md:h-[280px] lg:h-[317px]
            rounded-[16px] sm:rounded-[24px] lg:rounded-[36px]
            transition-transform duration-300
            group-hover:scale-[1.02]
            bg-black
          "
        >
          <OptimizedMedia
            src={src}
            alt={banner.subHeading}
            isVideo={isVideo}
            className="absolute inset-0 w-full h-full object-cover"
            priority={true}
          />

          <div className={`absolute inset-0 ${gradient} transition-colors duration-300`} />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-7 md:p-8">
            {/* Pill */}
            <div className="flex justify-start">
              <div className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md sm:rounded-lg">
                <span className="text-white text-xs sm:text-sm font-bold tracking-[0.12em] uppercase">
                  {banner.heading}
                </span>
              </div>
            </div>

            {/* Text */}
            <div className="text-white">
              <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold group-hover:text-gray-200 transition-colors leading-snug">
                {banner.subHeading}
              </h3>
              <p className="text-xs sm:text-sm md:text-base opacity-80 mt-1 line-clamp-2">
                {banner.tagline}
              </p>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  // Layout rules:
  // - If only one banner available → make it span the full width (single column)
  // - If both available → show standard 2-column grid
  const single = available.length === 1
  const singleBanner = single ? available[0] : null

  return (
    <section className="py-6">
      <div className="constrained-width">
        {single ? (
          <div className="grid grid-cols-1 gap-6">
            <Card
              banner={singleBanner as Banner}
              // use a slightly stronger overlay for single to ensure text legibility
              gradient="bg-black/30 group-hover:bg-black/40"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary */}
            <Card banner={primaryBanner as Banner} gradient="bg-black/30 group-hover:bg-black/40" />

            {/* Secondary */}
            <div className="relative">
              <Card banner={secondaryBanner as Banner} gradient="bg-black/20 group-hover:bg-black/30" />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
