import Image from "next/image";
import Link from "next/link";

import { productImageUrl } from "@/lib/storage";

import type { HomeCategory } from "../types";

export function CategoryRail({ categories }: { categories: HomeCategory[] }) {
  if (!categories.length) return null;
  return (
    <section aria-labelledby="shop-by-category">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E94560]">
            Find your setup
          </p>
          <h2
            id="shop-by-category"
            className="mt-1 font-serif text-2xl font-semibold text-slate-950 sm:text-3xl"
          >
            Shop by category
          </h2>
        </div>
        <Link href="/categories" className="text-sm font-semibold hover:text-[#E94560]">
          All categories
        </Link>
      </div>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 lg:grid-cols-10">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group w-28 shrink-0 snap-start text-center sm:w-auto"
          >
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <Image
                src={productImageUrl(category.image)}
                alt={category.name}
                fill
                sizes="(max-width: 639px) 112px, 10vw"
                className="object-contain p-3 transition-transform group-hover:scale-105"
              />
            </div>
            <span className="mt-2 block truncate text-sm font-semibold text-slate-800 group-hover:text-[#E94560]">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
