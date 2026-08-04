// src/lib/serverApi.ts
// Server-side API utilities for Server Components
// Queries database services directly in Node memory without internal HTTP fetches

import { asc, eq, getDatabase, homeBanners } from "@babascamera/db";
import { getStorefrontOrigin } from "@/lib/api/server-origin";
import {
  listBestSellingProducts,
  listBrands,
  listCatalogProducts,
  listCatalogProductsPage,
  listCategories,
  type CatalogProduct,
} from "@/lib/data/storefront";

const API_BASE_PATH =
  process.env.NEXT_PUBLIC_API_BASE_URL || "/api/storefront/legacy";

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
  const baseUrl = /^https?:\/\//i.test(API_BASE_PATH)
    ? API_BASE_PATH
    : `${await getStorefrontOrigin()}${API_BASE_PATH}`;
  const url = `${baseUrl}${endpoint}`;

  const fetchOptions: RequestInit = {
    headers: { 'Content-Type': 'application/json' },
    next: {
      revalidate: options?.revalidate ?? 60,
      ...(options?.tags ? { tags: options.tags } : {}),
    },
  };

  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${endpoint}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============ Banner API ============

export interface Banner {
  _id: string;
  heading?: string;
  subHeading?: string;
  tagline?: string;
  ctaName?: string;
  position: number;
  status: string;
  visibility: string;
  mediaFile?: {
    key: string;
    mimetype?: string;
  };
}

export async function getHeroBannersServer(): Promise<Banner[]> {
  try {
    const database = getDatabase();
    const rows = await database
      .select()
      .from(homeBanners)
      .where(eq(homeBanners.isActive, true))
      .orderBy(asc(homeBanners.position));

    return rows.map((item) => ({
      _id: item.id,
      heading: item.headline ?? "",
      subHeading: item.subheading ?? "",
      tagline: "",
      ctaName: item.buttonLabel ?? "Shop now",
      position: item.position,
      status: "Active",
      visibility: "Show",
      mediaFile: item.desktopMediaUrl ? { key: item.desktopMediaUrl } : undefined,
    }));
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

function mapCategory(
  category: Awaited<ReturnType<typeof listCategories>>[number],
  position: number,
): Category {
  return {
    _id: category.id,
    name: category.name,
    position,
    status: "Active",
    visibility: "Show",
    ...(category.imageUrl ? { image: { key: category.imageUrl } } : {}),
  };
}

export async function getCategoriesServer(): Promise<Category[]> {
  try {
    const categories = await listCategories();
    return categories.map(mapCategory);
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

function mapProduct(product: CatalogProduct): Product {
  return {
    _id: product.id,
    name: product.name,
    slug: product.slug,
    price: {
      actualPrice: Number(product.mrp),
      salePrice: Number(product.salePrice),
    },
    images: product.image ? [{ key: product.image }] : [],
    category: {
      _id: product.categorySlug ?? "uncategorized",
      name: product.categoryName ?? "Uncategorized",
    },
    ...(product.brandName
      ? {
        brand: {
          _id: product.brandSlug ?? "unbranded",
          name: product.brandName,
        },
      }
      : {}),
    quantity: product.stock,
    keyFeatures: product.shortDescription ?? undefined,
  };
}

export async function getPopularProductsServer(limit = 10): Promise<Product[]> {
  try {
    return (await listBestSellingProducts(limit)).map(mapProduct);
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
    return (await listBrands()).map((brand) => ({
      _id: brand.slug || brand.id,
      name: brand.name,
      slug: brand.slug,
      status: "Active",
      ...(brand.logoUrl ? { image: { key: brand.logoUrl } } : {}),
    }));
  } catch (error) {
    console.error('[getActiveBrandsServer] Error:', error);
    return [];
  }
}

// Check if a brand has products (for filtering)
export async function brandHasProductsServer(brandId: string): Promise<boolean> {
  try {
    const brands = await listBrands();
    const brand = brands.find((b) => b.id === brandId || b.slug === brandId);
    const data = await listCatalogProductsPage({
      ...(brand ? { brandSlug: brand.slug } : { brandSlug: brandId }),
      limit: 1,
    });
    return data.products.length > 0;
  } catch {
    return false;
  }
}

// Get active brands with products
export async function getActiveBrandsWithProductsServer(): Promise<Brand[]> {
  try {
    const [brands, products] = await Promise.all([
      getActiveBrandsServer(),
      listCatalogProducts({ limit: 20 }),
    ]);
    const brandSlugs = new Set(
      products.map((product) => product.brandSlug).filter(Boolean),
    );
    return brands.filter((brand) =>
      brandSlugs.has(brand._id) || (brand.slug ? brandSlugs.has(brand.slug) : false)
    );
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
    const [categories, brands] = await Promise.all([listCategories(), listBrands()]);
    const category = categories.find((item) => item.id === categoryId || item.slug === categoryId);
    if (!category) return { products: [], totalCount: 0 };
    const brand = options?.brand
      ? brands.find((item) => item.id === options.brand || item.slug === options.brand)
      : undefined;
    const data = await listCatalogProductsPage({
      categorySlug: category.slug,
      ...(brand ? { brandSlug: brand.slug } : {}),
      limit: options?.limit ?? 20,
    });

    return {
      products: data.products.map(mapProduct),
      totalCount: data.total,
    };
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
    const [categoryRows, catalogTotal] = await Promise.all([
      listCategories(),
      listCatalogProductsPage({ limit: 1 }),
    ]);
    const categories = categoryRows.map(mapCategory);

    const categoryPages = await Promise.all(
      categoryRows.map((catRow) =>
        listCatalogProductsPage({ categorySlug: catRow.slug, limit: 20 })
      )
    );

    const results: CategoryWithProducts[] = categories.map((category, index) => {
      const pageResult = categoryPages[index];
      const categoryProducts = (pageResult?.products ?? []).map(mapProduct);

      const brands = Array.from(
        new Map(
          categoryProducts
            .filter((product): product is Product & { brand: Brand } => Boolean(product.brand))
            .map((product) => [product.brand._id, product.brand]),
        ).values(),
      );

      return {
        category,
        products: categoryProducts,
        totalCount: pageResult?.total ?? categoryProducts.length,
        brands,
      };
    });

    // Filter out categories with no products
    const categoriesWithProducts = results.filter((r) => r.products.length > 0);
    const totalProducts = catalogTotal.total;

    return { categories: categoriesWithProducts, totalProducts };
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
  brands: Array<{ _id: string; name: string }>;
}

export async function getCategoryPageDataServer(
  categoryId: string,
  options?: { limit?: number }
): Promise<CategoryPageData> {
  try {
    const limit = options?.limit ?? 15;

    // Fetch category info and products in parallel
    const [categories, productData] = await Promise.all([
      getCategoriesServer(),
      getProductsByCategoryServer(categoryId, { limit }),
    ]);

    const category = categories.find((c) => c._id === categoryId) || null;

    // Extract unique brands from products
    const brandsMap = new Map<string, { _id: string; name: string }>();
    productData.products.forEach((p) => {
      if (p.brand && !brandsMap.has(p.brand._id)) {
        brandsMap.set(p.brand._id, { _id: p.brand._id, name: p.brand.name });
      }
    });

    return {
      category,
      products: productData.products,
      totalCount: productData.totalCount,
      totalPages: Math.ceil(productData.totalCount / limit),
      brands: Array.from(brandsMap.values()),
    };
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
    const limit = options?.limit ?? 15;
    const brands = await listBrands();
    const brandItem = brands.find((b) => b.id === brandId || b.slug === brandId);
    const brandSlug = brandItem?.slug ?? brandId;

    const productData = await listCatalogProductsPage({
      brandSlug,
      limit,
    });

    const brand: Brand | null = brandItem
      ? {
          _id: brandItem.slug || brandItem.id,
          name: brandItem.name,
          slug: brandItem.slug,
          status: "Active",
          ...(brandItem.logoUrl ? { image: { key: brandItem.logoUrl } } : {}),
        }
      : null;

    const products = productData.products.map(mapProduct);

    return {
      brand,
      products,
      totalCount: productData.total,
      totalPages: Math.max(Math.ceil(productData.total / limit), 1),
    };
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
  images?: Array<{ key: string }>;
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
    const database = getDatabase();
    const [item] = await database
      .select()
      .from(homeBanners)
      .where(eq(homeBanners.id, bannerId))
      .limit(1);

    if (!item) return { banner: null, products: [] };

    const banner: BannerData = {
      _id: item.id,
      heading: item.headline ?? "",
      subHeading: item.subheading ?? "",
      mediaFile: item.desktopMediaUrl ? { key: item.desktopMediaUrl } : undefined,
      collections: [],
    };

    return {
      banner,
      products: [],
    };
  } catch (error) {
    console.error('[getBannerDataServer] Error:', error);
    return { banner: null, products: [] };
  }
}
