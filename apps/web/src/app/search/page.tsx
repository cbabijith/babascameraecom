import { Button } from "@babascamera/ui";
import { ProductGrid } from "@/components/catalog/product-grid";
import { listCatalogProducts } from "@/lib/data/storefront";

export const metadata = { title: "Search" };
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const products = query
    ? await listCatalogProducts({ query, limit: 40 })
    : [];
  return (
    <section className="page-shell py-12">
      <h1 className="text-4xl font-bold">Search Baba&apos;s Camera</h1>
      <form
        action="/search"
        className="mt-6 flex max-w-2xl gap-3"
      >
        <input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Camera, lens, brand or category"
          className="h-12 min-w-0 flex-1 rounded-xl border border-slate-300 px-4"
          autoFocus
        />
        <Button
          type="submit"
          className="bg-[#E94560] hover:bg-[#D63852]"
        >
          Search
        </Button>
      </form>
      <div className="mt-9">
        <ProductGrid
          products={products}
          emptyMessage={
            query
              ? `No products found for “${query}”.`
              : "Enter a product, brand or category to search."
          }
        />
      </div>
    </section>
  );
}
