// src/components/products/product-list-client.tsx
// Client component for ProductList interactivity (filters, scroll, navigation)
"use client";

import Image from "next/image";
import ProductCard from "../common/product-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getImageUrl } from "@/lib/apiClient";
import { getProductsByCategory } from "@/instances/productInstance";
import ProductCardSkeleton from "../ui/product-card-skeleton";
import AppBreadcrumb from "../common/app-breadcrumb";

export interface CategorySection {
  category: {
    _id: string;
    name: string;
    image?: { key: string };
  };
  products: {
    _id: string;
    name: string;
    slug?: string;
    price?: { actualPrice?: number; salePrice?: number };
    images?: { key: string }[];
    category?: { _id: string; name: string };
    brand?: { _id: string; name: string };
    quantity?: number;
    keyFeatures?: string;
  }[];
  totalCount: number;
  brands: { _id: string; name: string }[];
  // State properties used during client-side filtering
  selectedBrand?: string | null;
  loading?: boolean;
  filteredTotalProducts?: number;
}

interface ProductListClientProps {
  categorySections: CategorySection[];
  totalProducts: number;
}

export default function ProductListClient({
  categorySections: initialSections,
  totalProducts,
}: ProductListClientProps) {
  const [categorySections, setCategorySections] = useState(initialSections);
  const DESKTOP_ROW_THRESHOLD = 4;

  const handleBrandFilter = async (
    categoryId: string,
    brandId: string | null
  ) => {
    // Set loading state for this category
    setCategorySections((prev) =>
      prev.map((s) =>
        s.category._id === categoryId
          ? { ...s, selectedBrand: brandId, loading: true }
          : s
      )
    );

    try {
      const params: { limit: number; brand?: string } = { limit: 20 };
      if (brandId) params.brand = brandId;
      
      const res = await getProductsByCategory(categoryId, params);
      
      setCategorySections((prev) =>
        prev.map((s) =>
          s.category._id === categoryId
            ? {
                ...s,
                products: res.results || [],
                filteredTotalProducts: res.totalCount || 0,
                loading: false,
              }
            : s
        )
      );
    } catch (e) {
      console.error("filter error:", e);
      setCategorySections((prev) =>
        prev.map((s) =>
          s.category._id === categoryId
            ? { ...s, loading: false }
            : s
        )
      );
    }
  };

  const scrollSection = useCallback(
    (categoryId: string, dir: "left" | "right") => {
      const el = document.getElementById(`scroll-${categoryId}`);
      if (!el) return;
      const { clientWidth } = el;
      const step = Math.max(1, Math.floor(clientWidth / 2));
      el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
    },
    []
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="constrained-width pt-3 sm:pt-6">
        <AppBreadcrumb
          items={[
            { label: "HOME", href: "/" },
            { label: "PRODUCTS" },
          ]}
        />
      </div>

      <div className="constrained-width py-3 sm:py-8">
        <div className="mb-3 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            All Products ({totalProducts})
          </h1>
        </div>

        <div className="space-y-3 sm:space-y-8">
          {categorySections
            .filter((s) => s.products && s.products.length > 0)
            .map((section) => (
              <section key={section.category._id} className="m-0">
                {/* Category header */}
                <div className="bg-[#F7F7F7] p-4 sm:p-6 rounded-lg mb-0 sm:mb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      {section.category.image && (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-white flex-shrink-0">
                          <Image
                            src={getImageUrl(section.category.image.key)}
                            alt={section.category.name}
                            width={48}
                            height={48}
                            className="object-contain w-full h-full p-1"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 capitalize truncate">
                          {section.category.name}
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600">
                          {section.totalCount || 0} products available
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {section.products && section.products.length > DESKTOP_ROW_THRESHOLD && (
                        <div className="hidden md:flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => scrollSection(section.category._id, "left")}
                            className="h-9 w-9 rounded-full bg-white border-gray-300"
                            aria-label="Scroll left"
                          >
                            <ChevronLeft className="w-4 h-4 text-gray-700" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => scrollSection(section.category._id, "right")}
                            className="h-9 w-9 rounded-full bg-white border-gray-300"
                            aria-label="Scroll right"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-700" />
                          </Button>
                        </div>
                      )}

                      {section.totalCount > section.products.length && (
                        <Link
                          href={`/products/category/${section.category._id}`}
                          className="inline-flex"
                        >
                          <Button variant="link" className="text-red-600 p-0 text-sm">
                            View More &gt;&gt;
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Brand Filter */}
                {section.brands && section.brands.length > 1 && (
                  <div className="flex items-center flex-wrap gap-2 sm:gap-3 py-2 my-1 sm:mb-6">
                    <Button
                      variant={section.selectedBrand === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleBrandFilter(section.category._id, null)}
                      className={`rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium ${
                        section.selectedBrand === null
                          ? "bg-gray-900 text-white"
                          : "bg-white text-gray-600 border-gray-300"
                      }`}
                    >
                      All
                    </Button>
                    {section.brands?.map((brand) => (
                      <Button
                        key={brand._id}
                        variant={section.selectedBrand === brand._id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleBrandFilter(section.category._id, brand._id)}
                        className={`rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium ${
                          section.selectedBrand === brand._id
                            ? "bg-gray-900 text-white"
                            : "bg-white text-gray-600 border-gray-300"
                        }`}
                      >
                        {brand.name ? brand.name.charAt(0).toUpperCase() + brand.name.slice(1) : ""}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Products row */}
                {section.loading ? (
                  <div className="flex gap-3 sm:gap-6 overflow-x-auto scrollbar-hide pb-0 sm:pb-4">
                    <ProductCardSkeleton count={4} className="flex-shrink-0" />
                  </div>
                ) : section.products && section.products.length > 0 ? (
                  <div className="relative">
                    <div
                      id={`scroll-${section.category._id}`}
                      className="flex overflow-x-auto scrollbar-hide pb-0 sm:pb-4 snap-x snap-mandatory md:snap-none gap-3 sm:gap-6"
                    >
                      {section.products.map((product) => (
                        <div key={product._id} className="flex-shrink-0 snap-start">
                          <ProductCard
                            id={product._id}
                            name={product.name}
                            slug={product.slug}
                            category={product.category?.name || ""}
                            price={product.price?.salePrice || 0}
                            originalPrice={
                              product.price?.actualPrice !== product.price?.salePrice
                                ? product.price?.actualPrice
                                : undefined
                            }
                            image={
                              product.images?.[0]
                                ? getImageUrl(product.images[0].key)
                                : "/placeholder.svg"
                            }
                            keyFeaturesHtml={product.keyFeatures}
                            brand={product.brand?.name}
                            inStock={(product.quantity ?? 0) > 0}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <p className="text-gray-500">No products available in this category</p>
                  </div>
                )}
              </section>
            ))}
        </div>

        {totalProducts === 0 && (
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Categories Found</h2>
            <p className="text-gray-600">No product categories available at the moment.</p>
          </div>
        )}
      </div>
    </main>
  );
}
