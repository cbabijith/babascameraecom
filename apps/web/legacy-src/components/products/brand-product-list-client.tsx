// src/components/products/brand-product-list-client.tsx
// Client component for BrandProductList interactivity (sort, pagination)
"use client";

import Image from "next/image";
import ProductCard from "../common/product-card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { getProductsByBrand } from "@/instances/productInstance";
import type { Product } from "@/types/product";
import { getImageUrl, getThumbnailUrl } from "@/lib/apiClient";
import Pagination from "@/components/ui/pagination";
import ProductListingSkeleton from "../ui/product-listing-skeleton";
import AppBreadcrumb from "../common/app-breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortOption as ApiSortOption } from "@/instances/productInstance";

type UiSortOption = ApiSortOption | "newest" | "popular";
const CLEAR_SORT_VALUE = "__clear__" as const;
const ITEMS_PER_PAGE = 15;

interface BrandInfo {
  _id: string;
  name: string;
  image?: { key: string };
}

interface BrandProductListClientProps {
  brandId: string;
  brand: BrandInfo | null;
  initialProducts: Product[];
  totalCount: number;
  totalPages: number;
}

export default function BrandProductListClient({
  brandId,
  brand,
  initialProducts,
  totalCount: initialTotalCount,
  totalPages: initialTotalPages,
}: BrandProductListClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [sort, setSort] = useState<UiSortOption | "">("");

  const sortOptions = [
    { label: "Newest", value: "newest" },
    { label: "Popular", value: "popular" },
    { label: "Name (A–Z)", value: "name_asc" },
    { label: "Name (Z–A)", value: "name_desc" },
    { label: "Price (Low → High)", value: "price_asc" },
    { label: "Price (High → Low)", value: "price_desc" },
  ];

  const fetchProducts = async (page: number, sortValue: string) => {
    try {
      setLoading(true);
      const response = await getProductsByBrand(brandId, {
        page,
        limit: ITEMS_PER_PAGE,
        ...(sortValue ? { sort: sortValue as ApiSortOption } : {}),
      });

      setProducts(response.results);
      setTotalPages(response.totalPages);
      setTotalCount(response.totalCount);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchProducts(page, sort);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSortChange = (value: string) => {
    if (value === CLEAR_SORT_VALUE) {
      setSort("");
      fetchProducts(1, "");
    } else {
      setSort(value as UiSortOption);
      fetchProducts(1, value);
    }
    setCurrentPage(1);
  };

  if (loading) {
    return <ProductListingSkeleton variant="grid" showHeader={false} cardCount={12} />;
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="constrained-width py-3 sm:pt-6">
        <AppBreadcrumb
          items={[
            { label: "HOME", href: "/" },
            { label: "PRODUCTS", href: "/products" },
            { label: brand?.name || "Brand" },
          ]}
        />
      </div>

      <div className="constrained-width py-3 sm:py-4">
        {/* Brand header + toolbar */}
        <div className="mb-3 sm:mb-4">
          {brand && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-4">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 border flex-shrink-0">
                  {brand.image ? (
                    <Image
                      src={getThumbnailUrl(brand.image.key)}
                      alt={brand.name}
                      width={80}
                      height={80}
                      className="object-contain w-full h-full p-2"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-gray-400 text-2xl font-bold">
                      {brand.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 capitalize truncate">
                    {brand.name}
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600">
                    {totalCount > 0
                      ? `${totalCount} product${totalCount === 1 ? "" : "s"} available`
                      : "No products available"}
                  </p>
                </div>
              </div>

              {/* Sort control */}
              {totalCount > 0 && (
                <div className="w-44">
                  <Select value={sort || undefined} onValueChange={handleSortChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      <SelectItem value={CLEAR_SORT_VALUE}>Clear Sort</SelectItem>
                      {sortOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {totalCount > 0 && (
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} products
            </div>
          )}
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
              {products.map((product) => (
                <div key={product._id} className="flex justify-center">
                  <ProductCard
                    id={product._id}
                    name={product.name}
                    slug={product.slug}
                    category={product.category?.name || ""}
                    price={product.price.salePrice}
                    originalPrice={
                      product.price.actualPrice !== product.price.salePrice
                        ? product.price.actualPrice
                        : undefined
                    }
                    image={
                      product.images?.[0]
                        ? getImageUrl(product.images[0].key)
                        : "/placeholder.svg"
                    }
                    keyFeaturesHtml={product.keyFeatures}
                    brand={product.brand?.name}
                    inStock={product.quantity > 0}
                  />
                </div>
              ))}
            </div>

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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Products Found</h2>
            <p className="text-gray-600 mb-6">
              No products are currently available from {brand?.name || "this brand"}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => (window.location.href = "/products")}>
                Browse All Products
              </Button>
              <Button variant="outline" onClick={() => history.back()}>
                Go Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
