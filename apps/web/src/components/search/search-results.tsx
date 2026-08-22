"use client";

import { Button } from "@/components/ui/button";
import ProductCard from "../common/product-card";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { searchProducts } from "@/instances/searchInstance";
import type { Product, Category, BrandAssociation } from "@/types/product";
import Pagination from "@/components/ui/pagination";
import { getImageUrl } from "@/lib/apiClient";
import AppBreadcrumb from "../common/app-breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import ProductCardSkeleton from "../ui/product-card-skeleton";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// pull brands from the same store as your Header/Category list
import { useAppDispatch, useAppSelector } from "@/store";
import { hydrateCategories } from "@/store/slice/categorySlice";

// ✅ import API sort type and extend for UI
import type { SortOption as ApiSortOption } from "@/instances/productInstance";

type UiSortOption = ApiSortOption | "newest" | "popular";
const CLEAR_SORT_VALUE = "__clear__" as const;
const ALL_BRANDS = "all";

interface SearchResultsProps {
  query: string;
  page: number;
}

export default function SearchResults({ query, page }: SearchResultsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // categories store → aggregate brands
  const dispatch = useAppDispatch();
  const { categories, status } = useAppSelector((s) => s.categories);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(page);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // ✅ sort + brand filter
  const [sort, setSort] = useState<UiSortOption | "">(""); // "" shows placeholder "Sort"
  const [selectedBrandId, setSelectedBrandId] = useState<string>(ALL_BRANDS);

  const ITEMS_PER_PAGE = 15;

  // hydrate categories to get brand list
  useEffect(() => {
    if (status === "idle" || status === "failed") {
      dispatch(hydrateCategories());
    }
  }, [dispatch, status]);

  // collect all Active+Show brands across categories, deduped
  const allActiveBrands = useMemo(() => {
    const dedup = new Map<string, BrandAssociation["brand"]>();
    const getActive = (brands?: BrandAssociation[]) =>
      (brands ?? [])
        .filter((b) => b.status === "Active" && b.visibility === "Show")
        .sort((a, b) => a.position - b.position);

    categories.forEach((c: Category) => {
      getActive(c.brands).forEach((ba) => {
        if (ba.brand?._id && !dedup.has(ba.brand._id)) {
          dedup.set(ba.brand._id, ba.brand);
        }
      });
    });

    // sort brands alphabetically
    return Array.from(dedup.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [categories]);

  // ✅ include Newest + Popular (no empty values here)
  const sortOptions = useMemo(
    () => [
      { label: "Newest", value: "newest" as UiSortOption },
      { label: "Popular", value: "popular" as UiSortOption },
      { label: "Name (A–Z)", value: "name_asc" as UiSortOption },
      { label: "Name (Z–A)", value: "name_desc" as UiSortOption },
      { label: "Price (Low → High)", value: "price_asc" as UiSortOption },
      { label: "Price (High → Low)", value: "price_desc" as UiSortOption },
    ],
    []
  );

  useEffect(() => {
    if (query) {
      fetchSearchResults(query, currentPage, sort, selectedBrandId);
    }
     
  }, [query, currentPage, sort, selectedBrandId]);

  const fetchSearchResults = async (
    searchQuery: string,
    pageNum: number,
    sortValue: UiSortOption | "",
    brandSel: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await searchProducts({
        search: searchQuery,
        page: pageNum,
        limit: ITEMS_PER_PAGE,
        ...(sortValue ? { sort: (sortValue as unknown as ApiSortOption) } : {}), // only when selected
        ...(brandSel !== ALL_BRANDS ? { brand: brandSel } : {}),
      });

      setProducts(response.results);
      setTotalPages(response.totalPages);
      setTotalCount(response.totalCount);
    } catch (err) {
      console.error("Error fetching search results:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch search results");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set("page", newPage.toString());
    // we keep URL updates only for page, like before
    router.push(`/products/search?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSortChange = (value: UiSortOption | "") => {
    setSort(value);
    setCurrentPage(1);
  };

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    setCurrentPage(1);
  };

  if (!query) {
    return (
      <main className="min-h-screen bg-white">
        <div className="constrained-width py-8">
          <div className="text-center py-16">
            <SearchIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Search Products</h1>
            <p className="text-gray-600">
              Enter a search term to find cameras, audio equipment, lighting, and more.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        {/* Breadcrumb */}
        <div className="constrained-width pt-3 sm:pt-4">
          <Skeleton className="h-4 w-48 rounded" />
        </div>

        <div className="constrained-width py-6 sm:py-8">
          {/* Header skeleton */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-72 max-w-[80vw]" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="hidden md:block">
                <Skeleton className="h-8 w-28 rounded-lg" />
              </div>
            </div>
          </div>

          {/* Grid skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-3 xl:gap-4">
            <ProductCardSkeleton count={10} />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-white">
        <div className="constrained-width py-8">
          <div className="mb-6 sm:mb-8">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-2 sm:-ml-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>

          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Search Error</h1>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchSearchResults(query, currentPage, sort, selectedBrandId)}>
              Try Again
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="constrained-width pt-3 sm:pt-4">
        <AppBreadcrumb
          items={[
            { label: "HOME", href: "/" },
            { label: "PRODUCTS", href: "/products" },
            { label: query || "Search" }, // active
          ]}
        />
      </div>

      <div className="constrained-width py-6 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 mb-1.5 sm:mb-2 whitespace-normal break-words leading-snug">
                Search Results for “{query}”
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                {totalCount > 0 ? `${totalCount} products found` : "No products found"}
              </p>
            </div>

            {/* 🔥 Toolbar: Brand + Sort */}
            <div className="flex items-center gap-2">
              {/* Brand */}
              <div className="w-36 sm:w-40 md:w-44">
                <Select value={selectedBrandId} onValueChange={handleBrandChange}>
                  <SelectTrigger size="sm" className="w-full px-2 gap-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value={ALL_BRANDS}>All brands</SelectItem>
                    {allActiveBrands.map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="w-36 sm:w-40 md:w-44">
                <Select
                  value={sort || undefined} // undefined shows placeholder
                  onValueChange={(v) => {
                    if (v === CLEAR_SORT_VALUE) {
                      handleSortChange("");
                    } else {
                      handleSortChange(v as UiSortOption);
                    }
                  }}
                >
                  <SelectTrigger size="sm" className="w-full px-2 gap-1">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {/* Clear uses non-empty sentinel to satisfy shadcn SelectItem constraints */}
                    <SelectItem value={CLEAR_SORT_VALUE}>Clear Sort</SelectItem>
                    {sortOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-3 xl:gap-4 mb-8">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  id={product._id}
                  name={product?.name}
                  slug={product.slug}
                  category={product.category?.name}
                  price={product.price?.salePrice}
                  originalPrice={
                    product.price.actualPrice !== product.price.salePrice
                      ? product.price.actualPrice
                      : undefined
                  }
                  image={product.images?.[0] ? getImageUrl(product.images[0].key) : "/placeholder.svg"}
                  keyFeaturesHtml={product.keyFeatures}
                  brand={product.brand?.name}
                  inStock={product.quantity > 0}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="mb-4">
              <SearchIcon className="w-16 h-16 mx-auto text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Products Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn&apos;t find any products matching “{query}”. Try different keywords or browse our
              categories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => router.push("/products")}>Browse All Products</Button>
              <Button variant="outline" onClick={() => router.push("/")}>
                Back to Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
