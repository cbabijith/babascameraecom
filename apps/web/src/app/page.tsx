import { LegacyHome } from "@/components/home/legacy-home";
import { getCartOwner } from "@/lib/cart-session";
import {
  getCartCount,
  isUserCartOwner,
  listBrands,
  listBestSellingProducts,
  listCatalogProducts,
  listCategories,
} from "@/lib/data/storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const owner = await getCartOwner();
  const [bestSellers, fallbackProducts, categories, brands, cartCount] = await Promise.all([
    listBestSellingProducts(8),
    listCatalogProducts({ limit: 8 }),
    listCategories(),
    listBrands(),
    getCartCount(owner),
  ]);

  return (
    <LegacyHome
      products={bestSellers.length ? bestSellers : fallbackProducts}
      categories={categories}
      brands={brands}
      cartCount={cartCount}
      accountHref={isUserCartOwner(owner) ? "/account" : "/auth/login"}
    />
  );
}
