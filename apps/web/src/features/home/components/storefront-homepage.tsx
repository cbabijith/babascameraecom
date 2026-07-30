import Image from "next/image";

import type { StorefrontHomeData } from "../types";
import { BrandRail } from "./brand-rail";
import { CategoryRail } from "./category-rail";
import { EmptyHomepageState } from "./empty-homepage-state";
import { HomeBannerCarousel } from "./home-banner-carousel";
import { ProductSection } from "./product-section";

export function StorefrontHomepage({ data }: { data: StorefrontHomeData }) {
  const hasProducts = Object.values(data.productSections).some((products) => products.length > 0);
  const empty =
    !data.banners.length && !data.categories.length && !data.brands.length && !hasProducts;

  if (empty) {
    return (
      <div className="page-shell py-10 sm:py-14">
        <EmptyHomepageState />
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="page-shell space-y-14 py-6 sm:space-y-20 sm:py-10">
        <h1 className="sr-only">Baba&apos;s Camera — cameras, lenses and creator gear</h1>
        {data.banners.length ? <HomeBannerCarousel banners={data.banners} /> : null}

        <CategoryRail categories={data.categories} />

        <ProductSection
          eyebrow="Editor’s picks"
          title="Featured gear"
          products={data.productSections.featured}
          href="/products?sort=featured"
        />
        <ProductSection
          eyebrow="Customer favourites"
          title="Best sellers"
          products={data.productSections.bestSellers}
        />
        <ProductSection
          eyebrow="Just landed"
          title="New arrivals"
          products={data.productSections.newArrivals}
          href="/products?sort=newest"
        />
        <ProductSection
          eyebrow="Worth a closer look"
          title="Current offers"
          products={data.productSections.offers}
        />

        <BrandRail brands={data.brands} />

        <section className="overflow-hidden rounded-3xl bg-[#1A1A2E] text-white lg:grid lg:grid-cols-[1fr_1.15fr]">
          <div className="flex items-center p-7 sm:p-10 lg:p-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF8A9B]">
                Since 1979
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
                Built for people who care about the frame
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
                From a first camera to a professional production kit, Baba&apos;s combines genuine
                gear with practical support from photographers who understand the work.
              </p>
            </div>
          </div>
          <div className="relative min-h-64 bg-slate-900 sm:min-h-80">
            <Image
              src="/herPage1.png"
              alt="Professional cinema camera equipment"
              fill
              sizes="(max-width: 1023px) 100vw, 55vw"
              className="object-cover opacity-90"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
