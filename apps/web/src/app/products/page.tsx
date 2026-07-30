import Link from "next/link";
import { Button, Input, Label } from "@babascamera/ui";
import { ProductGrid } from "@/components/catalog/product-grid";
import {
  listBrands,
  listCatalogProductsPage,
  listCategories,
  type CatalogFilters,
} from "@/lib/data/storefront";

export const metadata = { title: "All products" };
export const dynamic = "force-dynamic";

type ParamValue = string | string[] | undefined;
interface ProductSearchParams {
  q?: ParamValue;
  category?: ParamValue;
  brand?: ParamValue;
  minPrice?: ParamValue;
  maxPrice?: ParamValue;
  rating?: ParamValue;
  inStock?: ParamValue;
  sort?: ParamValue;
  page?: ParamValue;
}

const moneyPattern = /^(0|[1-9]\d*)(?:\.\d{1,2})?$/;

function first(value: ParamValue): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function list(value: ParamValue): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [
    ...new Set(
      values
        .flatMap((item) => item.split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function cleanMoney(value: string) {
  return value && moneyPattern.test(value) ? value : undefined;
}

function pageHref(params: ProductSearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(params)) {
    if (key === "page") continue;
    const value =
      key === "category" || key === "brand"
        ? list(rawValue).join(",")
        : first(rawValue);
    if (value) query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  const suffix = query.toString();
  return suffix ? `/products?${suffix}` : "/products";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ProductSearchParams>;
}) {
  const params = await searchParams;
  const [categories, brands] = await Promise.all([
    listCategories(),
    listBrands(),
  ]);
  const selectedCategories = list(params.category);
  const selectedBrands = list(params.brand);
  const selectedCategoryIds = new Set(
    categories
      .filter((category) => selectedCategories.includes(category.slug))
      .map((category) => category.id),
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (
        category.parentId &&
        selectedCategoryIds.has(category.parentId) &&
        !selectedCategoryIds.has(category.id)
      ) {
        selectedCategoryIds.add(category.id);
        changed = true;
      }
    }
  }
  const effectiveCategorySlugs = categories
    .filter((category) => selectedCategoryIds.has(category.id))
    .map((category) => category.slug);

  const page = Math.max(Number.parseInt(first(params.page) || "1", 10) || 1, 1);
  const pageSize = 24;
  const parsedRating = Number.parseInt(first(params.rating) || "0", 10);
  const minimumPrice = cleanMoney(first(params.minPrice));
  const maximumPrice = cleanMoney(first(params.maxPrice));
  const requestedSort = first(params.sort);
  const sort: CatalogFilters["sort"] =
    requestedSort === "newest" ||
    requestedSort === "price-asc" ||
    requestedSort === "price-desc" ||
    requestedSort === "rating"
      ? requestedSort
      : "featured";
  const query = first(params.q).trim();
  const result = await listCatalogProductsPage({
    ...(query ? { query } : {}),
    ...(effectiveCategorySlugs.length
      ? { categorySlugs: effectiveCategorySlugs }
      : {}),
    ...(selectedBrands.length ? { brandSlugs: selectedBrands } : {}),
    ...(minimumPrice ? { minPrice: minimumPrice } : {}),
    ...(maximumPrice ? { maxPrice: maximumPrice } : {}),
    ...(parsedRating >= 1 && parsedRating <= 5
      ? { minRating: parsedRating }
      : {}),
    inStock: first(params.inStock) === "1",
    sort,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const pageCount = Math.max(Math.ceil(result.total / pageSize), 1);

  const childrenByParent = new Map<string | null, typeof categories>();
  for (const category of categories) {
    const key = category.parentId ?? null;
    childrenByParent.set(key, [
      ...(childrenByParent.get(key) ?? []),
      category,
    ]);
  }
  const orderedCategories: ((typeof categories)[number] & { depth: number })[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const category of childrenByParent.get(parentId) ?? []) {
      orderedCategories.push({ ...category, depth });
      visit(category.id, depth + 1);
    }
  };
  visit(null, 0);
  for (const category of categories) {
    if (!orderedCategories.some((item) => item.id === category.id)) {
      orderedCategories.push({ ...category, depth: 0 });
    }
  }

  return (
    <section className="page-shell py-12">
      <p className="text-sm font-semibold text-[#E94560]">
        Baba&apos;s catalog
      </p>
      <h1 className="mt-1 text-4xl font-bold">Cameras and creator gear</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Browse authentic products with India-wide delivery and expert support.
      </p>

      <div className="mt-9 grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside>
          <form
            action="/products"
            className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 lg:sticky lg:top-24"
          >
            <div>
              <Label htmlFor="q">Search</Label>
              <Input
                id="q"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Name, SKU or details"
                className="mt-2 bg-white"
              />
            </div>

            <fieldset>
              <legend className="text-sm font-semibold">Categories</legend>
              <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-2">
                {orderedCategories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 text-sm"
                    style={{ paddingLeft: `${category.depth * 14}px` }}
                  >
                    <input
                      type="checkbox"
                      name="category"
                      value={category.slug}
                      defaultChecked={selectedCategories.includes(
                        category.slug,
                      )}
                      className="accent-[#E94560]"
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold">Brands</legend>
              <div className="mt-3 max-h-44 space-y-2 overflow-auto pr-2">
                {brands.map((brand) => (
                  <label
                    key={brand.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="brand"
                      value={brand.slug}
                      defaultChecked={selectedBrands.includes(brand.slug)}
                      className="accent-[#E94560]"
                    />
                    {brand.name}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold">Price range</legend>
              <div className="mt-3 space-y-3">
                <label className="block text-xs text-slate-500">
                  Minimum ₹{first(params.minPrice) || "0"}
                  <input
                    type="range"
                    name="minPrice"
                    min="0"
                    max="500000"
                    step="500"
                    defaultValue={first(params.minPrice) || "0"}
                    className="mt-1 w-full accent-[#E94560]"
                  />
                </label>
                <label className="block text-xs text-slate-500">
                  Maximum ₹{first(params.maxPrice) || "500000"}
                  <input
                    type="range"
                    name="maxPrice"
                    min="0"
                    max="500000"
                    step="500"
                    defaultValue={first(params.maxPrice) || "500000"}
                    className="mt-1 w-full accent-[#E94560]"
                  />
                </label>
              </div>
            </fieldset>

            <div>
              <Label htmlFor="rating">Minimum rating</Label>
              <select
                id="rating"
                name="rating"
                defaultValue={first(params.rating)}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">Any rating</option>
                {[4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating}+ stars
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="sort">Sort</Label>
              <select
                id="sort"
                name="sort"
                defaultValue={sort}
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="rating">Customer rating</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="inStock"
                value="1"
                defaultChecked={first(params.inStock) === "1"}
                className="accent-[#E94560]"
              />
              In stock only
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="submit"
                className="bg-[#E94560] hover:bg-[#D63852]"
              >
                Apply
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/products">Clear</Link>
              </Button>
            </div>
          </form>
        </aside>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              {result.total} {result.total === 1 ? "product" : "products"}
            </p>
            <p className="text-sm text-slate-500">
              Page {Math.min(page, pageCount)} of {pageCount}
            </p>
          </div>
          <div className="mt-4">
            <ProductGrid products={result.products} />
          </div>
          {pageCount > 1 ? (
            <nav
              aria-label="Catalog pagination"
              className="mt-10 flex justify-center gap-3"
            >
              <Button
                asChild
                variant="outline"
                aria-disabled={page <= 1}
                className={
                  page <= 1 ? "pointer-events-none opacity-50" : ""
                }
              >
                <Link href={pageHref(params, Math.max(page - 1, 1))}>
                  Previous
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                aria-disabled={page >= pageCount}
                className={
                  page >= pageCount
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              >
                <Link href={pageHref(params, Math.min(page + 1, pageCount))}>
                  Next
                </Link>
              </Button>
            </nav>
          ) : null}
        </div>
      </div>
    </section>
  );
}
