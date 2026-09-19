import Hero from "@/components/home/hero"
import Categories from "@/components/home/categories"
import TopSellers from "@/components/home/top-sellers"
import BrandsWeLove from "@/components/home/brands-we-love"

// Revalidate static homepage cache every 60 seconds (ISR)
export const revalidate = 60;

// Below-fold components — imported directly. Lazy-loading server components
// bakes empty suspense shells into the ISR HTML while the client hydrates
// real content, which React rejects as a hydration mismatch (#418).
import BannerSection from "@/components/home/banner-section";
import OfferZone from "@/components/home/offer-zone";
import StaticContent from "@/components/home/static-content";
import PromotionalCards from "@/components/home/promotional-cards";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white w-full max-w-full overflow-x-clip relative">
      <div className="space-y-2 sm:space-y-3 lg:space-y-4 pb-4 w-full max-w-full overflow-x-clip">
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
