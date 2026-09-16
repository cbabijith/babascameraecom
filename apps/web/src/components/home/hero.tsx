// src/components/home/hero.tsx
// Server Component - fetches banner data server-side for LCP optimization
import { Suspense } from "react";
import { HeroBannerSkeleton } from "@/components/ui/banner-skeleton";
import { getHeroBannersServer } from "@/lib/serverApi";
import { getHomepageHero } from "@/lib/data/settings";
import HeroClient from "./hero-client";

// Fallback slide built from the admin "Home page hero" settings, shown only
// when the banner manager has no active banners.
async function getSettingsHeroBanner() {
  const hero = await getHomepageHero();
  if (!hero.title && !hero.description) return null;
  return [
    {
      _id: "settings-hero",
      heading: hero.eyebrow,
      subHeading: hero.title,
      tagline: hero.description,
      ctaName: hero.primaryLabel,
      ctaHref: hero.primaryHref,
      position: 0,
      status: "Active",
      visibility: "Show",
      mediaType: "image" as const,
      ...(hero.imageUrl ? { mediaFile: { key: hero.imageUrl } } : {}),
    },
  ];
}

// Server Component wrapper - fetches data server-side
async function HeroContent() {
  const banners = await getHeroBannersServer();

  // Prefer real banners; fall back to the configured static hero slide.
  if (banners.length === 0) {
    const fallbackBanners = await getSettingsHeroBanner().catch(() => null);
    if (!fallbackBanners) return null;
    return <HeroClient banners={fallbackBanners} />;
  }

  // Pass pre-fetched data to client component for interactivity
  return <HeroClient banners={banners} />;
}

// Main export with Suspense boundary
export default function Hero() {
  return (
    <Suspense fallback={<HeroBannerSkeleton />}>
      <HeroContent />
    </Suspense>
  );
}
