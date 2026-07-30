import "server-only";

import type { Banner as StorefrontBanner } from "@/types/banner";
import type { Brand as StorefrontBrand } from "@/types/brand";
import type { Product as StorefrontProduct } from "@/types/product";
import {
  getBanner,
  getBrand,
  getCategory,
  listBanners,
  listBrands,
  listCategories,
  listProducts,
} from "@/lib/server/catalog";

export type Banner = StorefrontBanner;
export type Brand = StorefrontBrand;
export type Product = StorefrontProduct;

export type Category = {
  _id: string;
  name: string;
  position: number;
  status: string;
  visibility: string;
  image?: { key: string };
  brands?: Array<{
    brand: Brand;
    position: number;
    status: string;
    visibility: string;
    _id: string;
  }>;
};

export async function getHeroBannersServer(): Promise<Banner[]> {
  return (await listBanners("Hero")) as unknown as Banner[];
}

export async function getCategoriesServer(): Promise<Category[]> {
  return (await listCategories()) as unknown as Category[];
}

export async function getPopularProductsServer(limit = 10): Promise<Product[]> {
  const result = await listProducts({ sort: "popular", limit });
  return result.results as unknown as Product[];
}

export async function getActiveBrandsServer(): Promise<Brand[]> {
  return (await listBrands()) as unknown as Brand[];
}

export async function brandHasProductsServer(brandId: string): Promise<boolean> {
  const result = await listProducts({ brandId, limit: 1 });
  return result.totalCount > 0;
}

export async function getActiveBrandsWithProductsServer(): Promise<Brand[]> {
  const brands = await getActiveBrandsServer();
  const results = await Promise.all(
    brands.map(async (brand) => ({
      brand,
      hasProducts: await brandHasProductsServer(brand._id),
    })),
  );
  return results.filter((item) => item.hasProducts).map((item) => item.brand);
}

export async function getProductsByCategoryServer(
  categoryId: string,
  options?: { limit?: number; sort?: string },
): Promise<Product[]> {
  const result = await listProducts({
    categoryId,
    limit: options?.limit ?? 20,
    sort: options?.sort,
  });
  return result.results as unknown as Product[];
}

export async function getCategoriesWithProductsServer(): Promise<{
  categories: Array<{
    category: Category;
    products: Product[];
    totalCount: number;
    brands: Brand[];
  }>;
  totalProducts: number;
}> {
  const categories = await getCategoriesServer();
  const sections = await Promise.all(
    categories.map(async (category) => {
      const result = await listProducts({ categoryId: category._id, limit: 20 });
      const products = result.results as unknown as Product[];
      const brands = Array.from(
        new Map(
          products
            .filter((product) => product.brand?._id)
            .map((product) => [product.brand._id, product.brand]),
        ).values(),
      ) as unknown as Brand[];
      return {
        category,
        products,
        totalCount: result.totalCount,
        brands,
      };
    }),
  );
  return {
    categories: sections.filter((section) => section.totalCount > 0),
    totalProducts: sections.reduce((total, section) => total + section.totalCount, 0),
  };
}

export async function getCategoryPageDataServer(
  categoryId: string,
  page = 1,
  limit = 20,
) {
  const [category, result] = await Promise.all([
    getCategory(categoryId),
    listProducts({ categoryId, page, limit }),
  ]);
  const products = result.results as unknown as Product[];
  const brands = Array.from(
    new Map(
      products
        .filter((product) => product.brand?._id)
        .map((product) => [product.brand._id, product.brand]),
    ).values(),
  );
  return {
    category: category as unknown as Category,
    products,
    totalCount: result.totalCount,
    totalPages: result.totalPages,
    brands,
  };
}

export async function getBrandPageDataServer(
  brandId: string,
  page = 1,
  limit = 20,
) {
  const [brand, result] = await Promise.all([
    getBrand(brandId),
    listProducts({ brandId, page, limit }),
  ]);
  return {
    brand: brand as unknown as Brand,
    products: result.results as unknown as Product[],
    totalCount: result.totalCount,
    totalPages: result.totalPages,
  };
}

export async function getBannerDataServer(bannerId: string) {
  const banner = await getBanner(bannerId);
  const ids = Array.isArray((banner as { productIds?: unknown[] } | null)?.productIds)
    ? ((banner as { productIds: unknown[] }).productIds.map(String))
    : [];
  const all = ids.length ? await listProducts({ limit: -1 }) : null;
  return {
    banner: banner as unknown as Banner | null,
    products: (all?.results ?? []).filter((product) => ids.includes(product._id)) as unknown as Product[],
  };
}
