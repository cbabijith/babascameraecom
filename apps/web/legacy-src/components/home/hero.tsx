// src/components/home/hero.tsx
// Server Component - fetches banner data server-side for LCP optimization
import { Suspense } from "react";
import { HeroBannerSkeleton } from "@/components/ui/banner-skeleton";
import { getHeroBannersServer } from "@/lib/serverApi";
import HeroClient from "./hero-client";

// Server Component wrapper - fetches data server-side
async function HeroContent() {
  const banners = await getHeroBannersServer();
  
  // If no banners, render nothing
  if (banners.length === 0) {
    return null;
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
