// src/components/products/banner-products-client.tsx
// Client component for BannerProducts (currently no interactivity, but keeping pattern consistent)
"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/common/product-card";
import { OptimizedMedia } from "@/components/ui/optimized-media";
import { getImageUrl } from "@/lib/apiClient";
import AppBreadcrumb from "../common/app-breadcrumb";

interface BannerImage {
  key: string;
  mimetype?: string;
}

interface BannerProduct {
  _id: string;
  name: string;
  slug?: string;
  price: {
    actualPrice: number;
    salePrice: number;
    collectionDiscount?: number;
  };
  images?: Array<{ key: string }>;
  category?: { _id: string; name: string };
  brand?: { _id: string; name: string };
  quantity: number;
  keyFeatures?: string;
}

interface BannerInfo {
  _id: string;
  heading: string;
  subHeading: string;
  tagline?: string;
  mediaFile?: BannerImage;
}

interface BannerProductsClientProps {
  banner: BannerInfo;
  products: BannerProduct[];
}

export default function BannerProductsClient({
  banner,
  products,
}: BannerProductsClientProps) {
  const isVideo = banner.mediaFile?.mimetype?.startsWith("video/") || false;
  const mediaUrl = banner.mediaFile?.key
    ? getImageUrl(banner.mediaFile.key)
    : "/placeholder.svg";

  return (
    <main className="min-h-screen bg-white">
      <div className="constrained-width pt-3 sm:pt-6">
        <AppBreadcrumb
          items={[
            { label: "HOME", href: "/" },
            { label: "PRODUCTS", href: "/products" },
            { label: banner?.subHeading || banner?.heading || "Banner" },
          ]}
        />
      </div>

      {/* Banner Hero Section */}
      <div className="py-4 sm:py-6 bg-white">
        <div className="constrained-width">
          <div className="relative w-full h-[200px] sm:h-[260px] md:h-[320px] lg:h-[380px] rounded-[16px] sm:rounded-[24px] lg:rounded-[32px] overflow-hidden">
            <OptimizedMedia
              src={mediaUrl}
              alt={banner.subHeading}
              isVideo={isVideo}
              className="w-full h-full object-cover"
              priority
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-6 flex items-end sm:items-center">
              <div className="max-w-2xl text-white">
                <p className="text-[10px] sm:text-xs tracking-widest opacity-90 uppercase mb-1 sm:mb-2">
                  {banner.heading}
                </p>
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-semibold mb-2 sm:mb-3">
                  {banner.subHeading}
                </h1>
                <p className="text-xs sm:text-base opacity-90 leading-relaxed line-clamp-3 sm:line-clamp-none">
                  {banner.tagline}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="constrained-width py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            {banner.subHeading} Collection ({products.length})
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Explore our curated collection of {banner.subHeading.toLowerCase()} products
          </p>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {products.map((product) => (
              <ProductCard
                key={product._id}
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
            ))}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16">
            <div className="mb-4">
              <Image
                src="/product/camera.png"
                alt="No products"
                width={100}
                height={100}
                className="mx-auto opacity-50"
              />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Products Found</h3>
            <p className="text-gray-600 mb-6">
              This banner doesn&apos;t have any associated products yet.
            </p>
            <Link href="/products">
              <Button>Browse All Products</Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
