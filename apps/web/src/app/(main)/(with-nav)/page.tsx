import nextDynamic from 'next/dynamic';
import Hero from "@/components/home/hero"
import Categories from "@/components/home/categories"
import TopSellers from "@/components/home/top-sellers"
import BrandsWeLove from "@/components/home/brands-we-love"

// These sections read live catalog and banner data through the compatibility
// API. Rendering them per request prevents a production build from baking an
// empty homepage when no local HTTP server exists during compilation.
export const dynamic = "force-dynamic";

// Below-fold components - lazy loaded
const BannerSection = nextDynamic(() => import("@/components/home/banner-section"));
const OfferZone = nextDynamic(() => import("@/components/home/offer-zone"));
const StaticContent = nextDynamic(() => import("@/components/home/static-content"));
const PromotionalCards = nextDynamic(() => import("@/components/home/promotional-cards"));

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
     <div className="space-y-2 sm:space-y-3 lg:space-y-4 pb-4">
        {/* Extra top padding for nav → hero spacing */}
        <div className="constrained-width">
          <Hero />
        </div>

        {/* All other sections — much tighter now */}
        <Categories />
        <TopSellers />
        <BrandsWeLove />
        <BannerSection />
        <OfferZone />
        <StaticContent />
        <PromotionalCards />
      </div>
  </main>
  )
}
