import dynamic from 'next/dynamic';
import Hero from "@/components/home/hero"
import Categories from "@/components/home/categories"
import TopSellers from "@/components/home/top-sellers"
import BrandsWeLove from "@/components/home/brands-we-love"

// Below-fold components - lazy loaded
const BannerSection = dynamic(() => import("@/components/home/banner-section"));
const OfferZone = dynamic(() => import("@/components/home/offer-zone"));
const StaticContent = dynamic(() => import("@/components/home/static-content"));
const PromotionalCards = dynamic(() => import("@/components/home/promotional-cards"));

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
