import Link from "next/link";

import type { HomeProduct } from "../types";
import { HomeProductGrid } from "./product-grid";

export function ProductSection({
  title,
  eyebrow,
  products,
  href = "/products",
}: {
  title: string;
  eyebrow: string;
  products: HomeProduct[];
  href?: string;
}) {
  if (!products.length) return null;
  return (
    <section aria-labelledby={`home-${eyebrow.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#E94560]">{eyebrow}</p>
          <h2
            id={`home-${eyebrow.replace(/\s+/g, "-").toLowerCase()}`}
            className="mt-1 font-serif text-2xl font-semibold text-slate-950 sm:text-3xl"
          >
            {title}
          </h2>
        </div>
        <Link
          href={href}
          className="shrink-0 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
        >
          View all
        </Link>
      </div>
      <HomeProductGrid products={products} />
    </section>
  );
}
