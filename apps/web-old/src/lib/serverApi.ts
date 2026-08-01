// src/lib/serverApi.ts
// Server-side API utilities for Server Components
// Uses native fetch with Next.js caching

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  results?: T;
  result?: T;
  totalCount?: number;
}

/**
 * Server-side fetch wrapper with Next.js caching
 * Uses revalidate to cache responses for performance
 */
export async function serverFetch<T>(
  endpoint: string,
  options?: {
    revalidate?: number | false; // seconds, or false for no cache
    tags?: string[];
  }
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const fetchOptions: RequestInit = {
    headers: { 'Content-Type': 'application/json' },
    next: {
      revalidate: options?.revalidate ?? 60, // Default 60s cache
      tags: options?.tags,
    },
  };

  const response = await fetch(url, fetchOptions);
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return response.json();
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

interface BannerResponse extends ApiResponse<Banner[]> {
  results: Banner[];
}

export async function getHeroBannersServer(): Promise<Banner[]> {
  try {
    const data = await serverFetch<BannerResponse>(
      '/banner?type=Hero&limit=10',
      { revalidate: 300, tags: ['banners'] } // 5 min cache
    );
    
    if (!data.success || !data.results) {
      return [];
    }
    
    // Filter and sort active banners
    return data.results
      .filter(b => b.status === 'Active' && b.visibility === 'Show')
      .sort((a, b) => a.position - b.position);
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

interface CategoryResponse extends ApiResponse<Category[]> {
  results: Category[];
}

export async function getCategoriesServer(): Promise<Category[]> {
  try {
    const data = await serverFetch<CategoryResponse>(
      '/category?limit=-1',
      { revalidate: 300, tags: ['categories'] } // 5 min cache
    );
    
    if (!data.success || !data.results) {
      return [];
    }
    
    // Filter and sort active categories
    return data.results
      .filter(c => c.status === 'Active' && c.visibility === 'Show')
      .sort((a, b) => a.position - b.position);
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

interface ProductResponse extends ApiResponse<Product[]> {
  results: Product[];
  totalCount?: number;
}

export async function getPopularProductsServer(limit = 10): Promise<Product[]> {
  try {
    const data = await serverFetch<ProductResponse>(
      `/product?sort=popular&limit=${limit}`,
      { revalidate: 300, tags: ['products'] }
    );
    
    if (!data.success || !data.results) {
      return [];
    }
    
    return data.results;
  } catch (error) {
    console.error('[getPopularProductsServer] Error:', error);
    return [];
  }
}

// ============ Brand API ============

export interface Brand {
  _id: string;
  name: string;
  status?: string;
  image?: {
    key: string;
  };
}

interface BrandResponse extends ApiResponse<Brand[]> {
  results: Brand[];
}

export async function getActiveBrandsServer(): Promise<Brand[]> {
  try {
    const data = await serverFetch<BrandResponse>(
      '/brand/active',
      { revalidate: 300, tags: ['brands'] }
    );
    
    if (!data.success || !data.results) {
      return [];
    }
    
    return data.results;
  } catch (error) {
    console.error('[getActiveBrandsServer] Error:', error);
    return [];
  }
}

// Check if a brand has products (for filtering)
export async function brandHasProductsServer(brandId: string): Promise<boolean> {
  try {
    const data = await serverFetch<ProductResponse>(
      `/product?brand=${brandId}&limit=1`,
      { revalidate: 300 }
    );
    
    return data.success && data.results && data.results.length > 0;
  } catch {
    return false;
  }
}

// Get active brands with products
export async function getActiveBrandsWithProductsServer(): Promise<Brand[]> {
  try {
    const brands = await getActiveBrandsServer();
    
    // Check each brand for products in parallel
    const results = await Promise.allSettled(
      brands.map(async (brand) => {
        const hasProducts = await brandHasProductsServer(brand._id);
        return hasProducts ? brand : null;
      })
    );
    
    return results
      .filter((r): r is PromiseFulfilledResult<Brand> => 
        r.status === 'fulfilled' && r.value !== null
      )
      .map(r => r.value);
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
    let endpoint = `/product?category=${categoryId}&limit=${options?.limit ?? 20}`;
    if (options?.brand) {
      endpoint += `&brand=${options.brand}`;
    }
    
    const data = await serverFetch<ProductResponse>(endpoint, {
      revalidate: 300,
      tags: ['products', `category-${categoryId}`],
    });
    
    return {
      products: data.results || [],
      totalCount: data.totalCount || 0,
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
    // 1. Fetch all categories
    const categories = await getCategoriesServer();
    
    // 2. Fetch products for each category in parallel
    const results = await Promise.all(
      categories.map(async (category) => {
        const { products, totalCount } = await getProductsByCategoryServer(
          category._id,
          { limit: 20 }
        );
        
        // Extract unique brands from products
        const brandsMap = new Map<string, Brand>();
        products.forEach((p) => {
          if (p.brand && !brandsMap.has(p.brand._id)) {
            brandsMap.set(p.brand._id, p.brand);
          }
        });
        
        return {
          category,
          products,
          totalCount,
          brands: Array.from(brandsMap.values()),
        };
      })
    );
    
    // Filter out categories with no products
    const categoriesWithProducts = results.filter((r) => r.products.length > 0);
    const totalProducts = categoriesWithProducts.reduce(
      (sum, r) => sum + r.totalCount,
      0
    );
    
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
    
    // Fetch brand info and products
    const [brands, productData] = await Promise.all([
      getActiveBrandsServer(),
      serverFetch<ProductResponse>(
        `/product?brand=${brandId}&limit=${limit}`,
        { revalidate: 300, tags: ['products', `brand-${brandId}`] }
      ),
    ]);
    
    const brand = brands.find((b) => b._id === brandId) || null;
    const products = productData.results || [];
    const totalCount = productData.totalCount || 0;
    
    return {
      brand,
      products,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
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

interface BannerByIdResponse {
  success: boolean;
  result: BannerData;  // Note: 'result' singular, not 'results'
}

export async function getBannerDataServer(
  bannerId: string
): Promise<{ banner: BannerData | null; products: BannerCollection[] }> {
  try {
    const data = await serverFetch<BannerByIdResponse>(
      `/banner/${bannerId}`,
      { revalidate: 300, tags: ['banner', `banner-${bannerId}`] }
    );
    
    if (!data.success || !data.result) {
      return { banner: null, products: [] };
    }
    
    return {
      banner: data.result,
      products: data.result.collections || [],
    };
  } catch (error) {
    console.error('[getBannerDataServer] Error:', error);
    return { banner: null, products: [] };
  }
}



