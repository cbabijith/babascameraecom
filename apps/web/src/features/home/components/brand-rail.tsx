import Image from "next/image";
import Link from "next/link";

import { productImageUrl } from "@/lib/storage";

import type { HomeBrand } from "../types";

export function BrandRail({ brands }: { brands: HomeBrand[] }) {
  if (!brands.length) return null;
  return (
    <section aria-labelledby="shop-by-brand">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E94560]">
            Trusted names
          </p>
          <h2
            id="shop-by-brand"
            className="mt-1 font-serif text-2xl font-semibold text-slate-950 sm:text-3xl"
          >
            Shop by brand
          </h2>
        </div>
        <Link href="/brands" className="text-sm font-semibold hover:text-[#E94560]">
          All brands
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/brands/${brand.slug}`}
            className="group flex min-h-24 items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {brand.logo ? (
              <div className="relative h-12 w-full">
                <Image
                  src={productImageUrl(brand.logo)}
                  alt={`${brand.name} logo`}
                  fill
                  sizes="(max-width: 639px) 40vw, 12vw"
                  className="object-contain"
                />
              </div>
            ) : (
              <span className="text-center text-sm font-extrabold uppercase tracking-wide text-slate-800 group-hover:text-[#E94560]">
                {brand.name}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
