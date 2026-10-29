// src/lib/serverApiClient.ts
// HTTP client twin of @/lib/serverApi for the Vercel storefront. The
// storefront has NO database access: every function calls the Hono backend
// on Railway (BACKEND_ORIGIN), which owns the database. Exported types and
// fallback behaviour mirror the direct-query implementation exactly.

import "server-only";

import { backendFetch } from "@/lib/backend-fetch";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  results?: T;
  result?: T;
  totalCount?: number;
}

/**
 * Server-side fetch wrapper kept for external API integration if needed
 */
export async function serverFetch<T>(
  endpoint: string,
  options?: {
    revalidate?: number | false; // seconds, or false for no cache
    tags?: string[];
    timeoutMs?: number;
  }
): Promise<T> {
  return backendFetch<T>(endpoint, options);
}

// ============ Banner API ============

export interface Banner {
  _id: string;
  heading?: string;
  subHeading?: string;
  tagline?: string;
  ctaName?: string;
  ctaHref?: string;
  position: number;
  status: string;
  visibility: string;
  mediaType?: string;
  posterUrl?: string;
  mediaFile?: {
    key: string;
    mimetype?: string;
  };
}

export async function getHeroBannersServer(): Promise<Banner[]> {
  try {
    return await backendFetch<Banner[]>("/api/storefront/rsc/banners", { revalidate: 60, tags: ["home"] });
  } catch (error) {
    console.error('[getHeroBannersServer] Error:', error);
    return [];
  }
}

// ============ Category API ============

export interface Category {
  _id: string;
  name: string;
  position: number;
  status: string;
  visibility: string;
  image?: {
    key: string;
  };
}

export async function getCategoriesServer(): Promise<Category[]> {
  try {
    return await backendFetch<Category[]>("/api/storefront/rsc/categories", { revalidate: 60, tags: ["home"] });
  } catch (error) {
    console.error('[getCategoriesServer] Error:', error);
    return [];
  }
}

// ============ Product API ============

export interface ProductPrice {
  actualPrice?: number;
  salePrice?: number;
}

export interface ProductImage {
  key: string;
}

export interface Product {
  _id: string;
  name: string;
  slug?: string;
  price?: ProductPrice;
  images?: ProductImage[];
  category?: {
    _id: string;
    name: string;
  };
  brand?: Brand;
  quantity?: number;
  keyFeatures?: string;
}

export async function getPopularProductsServer(limit = 10): Promise<Product[]> {
  try {
    return await backendFetch<Product[]>(`/api/storefront/rsc/popular?limit=${limit}`, { revalidate: 60, tags: ["home"] });
  } catch (error) {
    console.error('[getPopularProductsServer] Error:', error);
    return [];
  }
}

// ============ Brand API ============

export interface Brand {
  _id: string;
  name: string;
  slug?: string;
  status?: string;
  image?: {
    key: string;
  };
}

export async function getActiveBrandsServer(): Promise<Brand[]> {
  try {
    return await backendFetch<Brand[]>("/api/storefront/rsc/brands", { revalidate: 60, tags: ["home"] });
  } catch (error) {
    console.error('[getActiveBrandsServer] Error:', error);
    return [];
  }
}

// Check if a brand has products (for filtering)
export async function brandHasProductsServer(brandId: string): Promise<boolean> {
  try {
    const result = await backendFetch<{ hasProducts: boolean }>(
      `/api/storefront/rsc/brand/${encodeURIComponent(brandId)}/has-products`,
    );
    return result.hasProducts;
  } catch {
    return false;
  }
}

// Homepage brand rail: the ordering/filtering runs on the backend.
export async function getActiveBrandsWithProductsServer(): Promise<Brand[]> {
  try {
    return await backendFetch<Brand[]>("/api/storefront/rsc/brands-with-products", { revalidate: 60, tags: ["home"] });
  } catch (error) {
    console.error('[getActiveBrandsWithProductsServer] Error:', error);
    return [];
  }
}

// ============ Products by Category API ============

export async function getProductsByCategoryServer(
  categoryId: string,
  options?: { limit?: number; brand?: string }
): Promise<{ products: Product[]; totalCount: number }> {
  try {
    const params = new URLSearchParams();
    if (options?.limit !== undefined) params.set("limit", String(options.limit));
    if (options?.brand) params.set("brand", options.brand);
    const query = params.toString();
    return await backendFetch<{ products: Product[]; totalCount: number }>(
      `/api/storefront/rsc/products-by-category/${encodeURIComponent(categoryId)}${query ? `?${query}` : ""}`,
    );
  } catch (error) {
    console.error('[getProductsByCategoryServer] Error:', error);
    return { products: [], totalCount: 0 };
  }
}

// Get all categories with their products for the /products page
export interface CategoryWithProducts {
  category: Category;
  products: Product[];
  totalCount: number;
  brands: Brand[];
}

export async function getCategoriesWithProductsServer(): Promise<{
  categories: CategoryWithProducts[];
  totalProducts: number;
}> {
  try {
    return await backendFetch<{ categories: CategoryWithProducts[]; totalProducts: number }>(
      "/api/storefront/rsc/categories-with-products",
    );
  } catch (error) {
    console.error('[getCategoriesWithProductsServer] Error:', error);
    return { categories: [], totalProducts: 0 };
  }
}

// ============ Category Page API (for /products/category/[id]) ============

export interface CategoryPageData {
  category: Category | null;
  products: Product[];
  totalCount: number;
  totalPages: number;
  brands: { _id: string; name: string }[];
}

export async function getCategoryPageDataServer(
  categoryId: string,
  options?: { limit?: number }
): Promise<CategoryPageData> {
  try {
    const query = options?.limit !== undefined ? `?limit=${options.limit}` : "";
    return await backendFetch<CategoryPageData>(
      `/api/storefront/rsc/category-page/${encodeURIComponent(categoryId)}${query}`,
    );
  } catch (error) {
    console.error('[getCategoryPageDataServer] Error:', error);
    return {
      category: null,
      products: [],
      totalCount: 0,
      totalPages: 0,
      brands: [],
    };
  }
}

// ============ Brand Page API (for /products/brand/[brandId]) ============

export interface BrandPageData {
  brand: Brand | null;
  products: Product[];
  totalCount: number;
  totalPages: number;
}

export async function getBrandPageDataServer(
  brandId: string,
  options?: { limit?: number }
): Promise<BrandPageData> {
  try {
    const query = options?.limit !== undefined ? `?limit=${options.limit}` : "";
    return await backendFetch<BrandPageData>(
      `/api/storefront/rsc/brand-page/${encodeURIComponent(brandId)}${query}`,
    );
  } catch (error) {
    console.error('[getBrandPageDataServer] Error:', error);
    return {
      brand: null,
      products: [],
      totalCount: 0,
      totalPages: 0,
    };
  }
}

// ============ Banner Page API (for /products/banner/[bannerId]) ============

interface BannerImage {
  key: string;
  mimetype?: string;
}

interface BannerCollection {
  _id: string;
  name: string;
  slug?: string;
  price: {
    actualPrice: number;
    salePrice: number;
    collectionDiscount?: number;
  };
  images?: { key: string }[];
  category?: { _id: string; name: string };
  brand?: { _id: string; name: string };
  quantity: number;
  keyFeatures?: string;
}

interface BannerData {
  _id: string;
  heading: string;
  subHeading: string;
  tagline?: string;
  mediaFile?: BannerImage;
  collections: BannerCollection[];
}

export async function getBannerDataServer(
  bannerId: string
): Promise<{ banner: BannerData | null; products: BannerCollection[] }> {
  try {
    return await backendFetch<{ banner: BannerData | null; products: BannerCollection[] }>(
      `/api/storefront/rsc/banner/${encodeURIComponent(bannerId)}`,
    );
  } catch (error) {
    console.error('[getBannerDataServer] Error:', error);
    return { banner: null, products: [] };
  }
}
