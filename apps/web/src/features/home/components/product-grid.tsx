import type { HomeProduct } from "../types";
import { HomeProductCard } from "./product-card";

export function HomeProductGrid({ products }: { products: HomeProduct[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((product) => (
        <HomeProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
