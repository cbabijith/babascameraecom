// src/components/products/category-product-list-client.tsx
// Client component for CategoryProductList interactivity (filters, sort, pagination)
"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import ProductCard from "../common/product-card";
import { useState } from "react";
import { getProductsByCategory } from "@/instances/productInstance";
import type { Product } from "@/types/product";
import { getImageUrl } from "@/lib/apiClient";
import ProductCardSkeleton from "../ui/product-card-skeleton";
import AppBreadcrumb from "../common/app-breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from "@/components/ui/pagination";
import type { SortOption as ApiSortOption } from "@/instances/productInstance";

type UiSortOption = ApiSortOption | "newest" | "popular";
const ALL_BRANDS = "all";
const CLEAR_SORT_VALUE = "__clear__" as const;

interface BrandInfo {
  _id: string;
  name: string;
}

interface CategoryInfo {
  _id: string;
  name: string;
  image?: { key: string };
}

interface CategoryProductListClientProps {
  categoryId: string;
  category: CategoryInfo | null;
  initialProducts: Product[];
  totalCount: number;
  totalPages: number;
  brands: BrandInfo[];
}

export default function CategoryProductListClient({
  categoryId,
  category,
  initialProducts,
  totalCount: initialTotalCount,
  totalPages: initialTotalPages,
  brands,
}: CategoryProductListClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [sort, setSort] = useState<UiSortOption | "">("");
  const [selectedBrandId, setSelectedBrandId] = useState<string>(ALL_BRANDS);

  const ITEMS_PER_PAGE = 15;

  const sortOptions = [
    { label: "Newest", value: "newest" },
    { label: "Popular", value: "popular" },
    { label: "Name (A–Z)", value: "name_asc" },
    { label: "Name (Z–A)", value: "name_desc" },
    { label: "Price (Low → High)", value: "price_asc" },
    { label: "Price (High → Low)", value: "price_desc" },
  ];

  const fetchProducts = async (page: number, brandId: string, sortOption: string) => {
    try {
      setLoading(true);
      const brandParam = brandId !== ALL_BRANDS ? brandId : undefined;
      
      const response = await getProductsByCategory(categoryId, {
        page,
        limit: ITEMS_PER_PAGE,
        ...(brandParam ? { brand: brandParam } : {}),
        ...(sortOption ? { sort: sortOption as ApiSortOption } : {}),
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
    fetchProducts(page, selectedBrandId, sort);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    setCurrentPage(1);
    fetchProducts(1, brandId, sort);
  };

  const handleSortChange = (value: string) => {
    if (value === CLEAR_SORT_VALUE) {
      setSort("");
      fetchProducts(1, selectedBrandId, "");
    } else {
      setSort(value as UiSortOption);
      fetchProducts(1, selectedBrandId, value);
    }
    setCurrentPage(1);
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="constrained-width py-3 sm:pt-6">
        <AppBreadcrumb
          items={[
            { label: "HOME", href: "/" },
            { label: "PRODUCTS", href: "/products" },
            {
              label: category?.name
                ? category.name.charAt(0).toUpperCase() + category.name.slice(1).toLowerCase()
                : "CATEGORY",
            },
          ]}
        />
      </div>

      {/* Header */}
      <div className="constrained-width pt-2 sm:pt-3 pb-4 sm:pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
          <div className="flex items-center gap-3 sm:gap-4">
            {category?.image?.key && (
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-white border border-gray-200 flex-shrink-0">
                <Image
                  src={getImageUrl(category.image.key)}
                  alt={category?.name || "Category"}
                  width={64}
                  height={64}
                  className="object-contain w-full h-full p-1.5"
                />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-medium text-[#000000B2] truncate">
                {category?.name
                  ? category.name.charAt(0).toUpperCase() + category.name.slice(1).toLowerCase()
                  : "Category"}{" "}
                ({totalCount})
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                Photography equipment and accessories
                {category?.name ? ` in ${category?.name}` : ""}
              </p>
            </div>
          </div>

          {/* Toolbar: Brand filter + Sort */}
          <div className="flex items-center gap-2">
            {/* Brand filter */}
            {brands.length > 0 && (
              <div className="w-36 sm:w-40 md:w-44">
                <Select value={selectedBrandId} onValueChange={handleBrandChange}>
                  <SelectTrigger size="sm" className="w-full px-2 gap-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value={ALL_BRANDS}>All brands</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand._id} value={brand._id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Sort */}
            <div className="w-36 sm:w-40 md:w-44">
              <Select value={sort || undefined} onValueChange={handleSortChange}>
                <SelectTrigger size="sm" className="w-full px-2 gap-1">
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
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="constrained-width pt-0 pb-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-3 xl:gap-4">
            <ProductCardSkeleton count={10} />
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-3 xl:gap-4 mb-8">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  id={product._id}
                  name={product.name}
                  slug={product.slug}
                  category={product.category?.name}
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
            <div className="mb-4">
              <Image
                src="/product/camera.png"
                alt="No products"
                width={100}
                height={100}
                className="mx-auto opacity-50"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Products Found</h2>
            <p className="text-gray-600 mb-6">
              {selectedBrandId !== ALL_BRANDS
                ? "No products match this brand filter in this category."
                : "We don't have any products in this category yet. Check back soon!"}
            </p>
            <div className="flex gap-2 justify-center">
              {selectedBrandId !== ALL_BRANDS && (
                <Button variant="outline" onClick={() => handleBrandChange(ALL_BRANDS)}>
                  Clear Brand Filter
                </Button>
              )}
              <Button onClick={() => (window.location.href = "/products")}>
                Browse All Products
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
