// src/app/(main)/(no-nav)/products/[slugId]/page.tsx
import { cache } from "react";

import ProductDetails from "@/components/products/product-details";
import { backendFetch } from "@/lib/backend-fetch";
import { extractIdFromSlugPath } from "@/lib/slug";
import { legacyProductDetail } from "@/features/catalog/services/legacy-product-payload";
import { resolveMediaUrl } from "@/lib/media-proxy";
import type { Product } from "@/types/product";
import type { CatalogProduct, ProductDetail } from "@/features/catalog/services/catalog-service";

interface ProductPageProps {
  params: Promise<{ slugId: string }>; // <- Promise here
}

// ISR: render the server-side product fetch once per minute per slug instead
// of paying the API round trips on every request.
export const revalidate = 60;

// Shared between generateMetadata and the page body so the product is
// fetched from the backend once per request.
const loadProduct = cache(async (productId: string) => {
  try {
    const { product } = await backendFetch<{ product: ProductDetail | null }>(
      `/api/storefront/rsc/product/${encodeURIComponent(productId)}`,
      { revalidate: 60, tags: ["product", `product:${productId}`] },
    );
    return product;
  } catch {
    return null;
  }
});

async function loadRelated(productId: string) {
  try {
    const { products } = await backendFetch<{ products: CatalogProduct[] }>(
      `/api/storefront/rsc/related/${encodeURIComponent(productId)}`,
      { revalidate: 60, tags: ["product", `product:${productId}`] },
    );
    return products;
  } catch {
    return [];
  }
}

async function buildInitialProduct(productId: string): Promise<Product | null> {
  const found = await loadProduct(productId);
  if (!found) return null;
  const relatedProducts = await loadRelated(productId);
  return legacyProductDetail(found, relatedProducts) as unknown as Product;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slugId } = await params;                 // <- await
  const productId = extractIdFromSlugPath(slugId);

  // Fetch server-side so the first paint carries real content instead of a
  // skeleton; ProductDetails still refetches client-side when this fails.
  const initialProduct = await buildInitialProduct(productId).catch(() => null);

  return (
    <ProductDetails
      key={productId}
      productId={productId}
      initialProduct={initialProduct}
    />
  );
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slugId } = await params;                 // <- await
  const productId = extractIdFromSlugPath(slugId);

  try {
    // Query the backend directly — the browser API client cannot run in a
    // server component and its retry loop stalls metadata for ~60s.
    const product = await loadProduct(productId);

    const title = product?.name
      ? `${product.name} – Babas Photo Store`
      : "Product Details – Babas Photo Store";

    const description =
      (product?.description ?? product?.shortDescription ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160) || "Photography equipment and accessories details";

    const firstImage = product?.images?.[0]?.url;
    const ogImages = firstImage
      ? [{ url: resolveMediaUrl(firstImage, firstImage) }]
      : [];

    return {
      title,
      description,
      openGraph: { title, description, images: ogImages },
      alternates: { canonical: `/products/${slugId}` },
    };
  } catch {
    return {
      title: "Product Details – Babas Photo Store",
      description: "Photography equipment and accessories details",
      alternates: { canonical: `/products/${slugId}` },
    };
  }
}
