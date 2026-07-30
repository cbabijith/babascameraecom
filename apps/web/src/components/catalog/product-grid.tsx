import { ProductCard } from "./product-card";
import type { CatalogProduct } from "@/lib/data/storefront";

export function ProductGrid({
  products,
  emptyMessage = "No products match your selection.",
}: {
  products: CatalogProduct[];
  emptyMessage?: string;
}) {
  if (!products.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-16 text-center text-slate-500">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
