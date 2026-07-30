import type { z } from "zod";

import type {
  homeBannerSchema,
  homeBrandSchema,
  homeCategorySchema,
  homeProductSchema,
  storefrontHomeDataSchema,
  storefrontHomeResponseSchema,
  storefrontHomeSuccessSchema,
} from "../schemas/home-schema";

export type HomeBanner = z.infer<typeof homeBannerSchema>;
export type HomeCategory = z.infer<typeof homeCategorySchema>;
export type HomeBrand = z.infer<typeof homeBrandSchema>;
export type HomeProduct = z.infer<typeof homeProductSchema>;
export type StorefrontHomeData = z.infer<typeof storefrontHomeDataSchema>;
export type StorefrontHomeSuccess = z.infer<typeof storefrontHomeSuccessSchema>;
export type StorefrontHomeResponse = z.infer<typeof storefrontHomeResponseSchema>;

export interface HomeBannerRecord extends HomeBanner {
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface HomeCategoryRecord extends HomeCategory {
  isActive: boolean;
}

export interface HomeBrandRecord extends HomeBrand {
  isActive: boolean;
}

export interface HomeProductRecord {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  brandSlug: string | null;
  categoryName: string;
  categorySlug: string;
  imageUrl: string | null;
  imageAltText: string | null;
  mrp: string;
  salePrice: string;
  stock: number;
  isActive: boolean;
  categoryIsActive: boolean;
}

export interface HomeProductCandidates {
  featured: string[];
  bestSellers: string[];
  newArrivals: string[];
  offers: string[];
}

export interface HomeRepository {
  listBannerCandidates(): Promise<HomeBannerRecord[]>;
  listCategories(limit: number): Promise<HomeCategoryRecord[]>;
  listBrands(limit: number): Promise<HomeBrandRecord[]>;
  listProductCandidates(limit: number): Promise<HomeProductCandidates>;
  listProductsByIds(ids: string[]): Promise<HomeProductRecord[]>;
}
