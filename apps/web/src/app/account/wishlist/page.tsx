import { ProductGrid } from "@/components/catalog/product-grid";
import { requireUser } from "@/lib/auth/session";
import { listWishlistProducts } from "@/lib/data/storefront";

export const metadata = { title: "Wishlist" };
export const dynamic = "force-dynamic";

export default async function AccountWishlistPage() {
  const user = await requireUser("/account/wishlist");
  const products = await listWishlistProducts(user.id);
  return (
    <section>
      <h1 className="text-3xl font-bold">Wishlist</h1>
      <p className="mt-2 text-slate-600">The gear you want to revisit.</p>
      <div className="mt-7">
        <ProductGrid
          products={products}
          emptyMessage="You have not saved any products yet."
        />
      </div>
    </section>
  );
}
