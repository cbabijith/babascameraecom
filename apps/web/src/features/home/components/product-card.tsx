import Image from "next/image";
import Link from "next/link";

import { productImageUrl } from "@/lib/storage";

import type { HomeProduct } from "../types";
import { PriceDisplay } from "./price-display";

export function HomeProductCard({ product }: { product: HomeProduct }) {
  return (
    <article className="group min-w-0">
      <Link
        href={`/products/${product.slug}`}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E94560] focus-visible:ring-offset-2"
      >
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {product.discountPercent > 0 ? (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-[#E94560] px-2.5 py-1 text-[11px] font-bold text-white">
              {product.discountPercent}% off
            </span>
          ) : null}
          <Image
            src={productImageUrl(product.image?.url)}
            alt={product.image?.altText || product.name}
            fill
            sizes="(max-width: 639px) 44vw, (max-width: 1023px) 30vw, 22vw"
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03] sm:p-6"
          />
        </div>
        <div className="px-0.5 pt-3">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-[#E94560]">
            {product.brand?.name ?? product.category.name}
          </p>
          <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-900 group-hover:text-[#C92E48] sm:min-h-12 sm:text-base sm:leading-6">
            {product.name}
          </h3>
          <PriceDisplay
            salePrice={product.salePrice}
            mrp={product.mrp}
            discountPercent={product.discountPercent}
          />
          <p className="mt-2 text-xs font-medium text-emerald-700">In stock</p>
        </div>
      </Link>
    </article>
  );
}
