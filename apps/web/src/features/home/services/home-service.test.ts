import { describe, expect, it } from "vitest";

import type {
  HomeBannerRecord,
  HomeBrandRecord,
  HomeCategoryRecord,
  HomeProductRecord,
  HomeRepository,
} from "../types";
import { getStorefrontHome, isBannerCurrentlyActive, toPublicHomeProduct } from "./home-service";

const IDS = {
  banner: "00000000-0000-4000-8000-000000000001",
  categoryA: "00000000-0000-4000-8000-000000000002",
  categoryB: "00000000-0000-4000-8000-000000000003",
  brandA: "00000000-0000-4000-8000-000000000004",
  brandB: "00000000-0000-4000-8000-000000000005",
  productA: "00000000-0000-4000-8000-000000000006",
  productB: "00000000-0000-4000-8000-000000000007",
  productC: "00000000-0000-4000-8000-000000000008",
};

const now = new Date("2026-07-30T10:00:00.000Z");

function banner(overrides: Partial<HomeBannerRecord> = {}): HomeBannerRecord {
  return {
    id: IDS.banner,
    mediaType: "image",
    desktopMediaUrl: "/banner-desktop.webp",
    mobileMediaUrl: "/banner-mobile.webp",
    posterUrl: null,
    altText: "Camera promotion",
    headline: "Create more",
    subheading: null,
    buttonLabel: "Shop",
    destinationUrl: "/products",
    openInNewTab: false,
    position: 0,
    isActive: true,
    startsAt: null,
    endsAt: null,
    ...overrides,
  };
}

function category(id: string, name: string, position: number, isActive = true): HomeCategoryRecord {
  return {
    id,
    name,
    slug: name.toLowerCase(),
    image: null,
    parentId: null,
    position,
    isActive,
  };
}

function brand(id: string, name: string, position: number, isActive = true): HomeBrandRecord {
  return {
    id,
    name,
    slug: name.toLowerCase(),
    logo: null,
    position,
    isActive,
  };
}

function product(id: string, overrides: Partial<HomeProductRecord> = {}): HomeProductRecord {
  return {
    id,
    name: `Product ${id.at(-1)}`,
    slug: `product-${id.at(-1)}`,
    brandName: "Canon",
    brandSlug: "canon",
    categoryName: "Cameras",
    categorySlug: "cameras",
    imageUrl: "/product/camera.png",
    imageAltText: null,
    mrp: "1000.00",
    salePrice: "750.00",
    stock: 3,
    isActive: true,
    categoryIsActive: true,
    ...overrides,
  };
}

function repository(overrides: Partial<HomeRepository> = {}): HomeRepository {
  const products = [product(IDS.productA), product(IDS.productB), product(IDS.productC)];
  return {
    listBannerCandidates: async () => [banner()],
    listCategories: async () => [
      category(IDS.categoryA, "Lenses", 2),
      category(IDS.categoryB, "Cameras", 1),
    ],
    listBrands: async () => [brand(IDS.brandA, "Sony", 3), brand(IDS.brandB, "Canon", 1)],
    listProductCandidates: async () => ({
      featured: [IDS.productA, IDS.productB],
      bestSellers: [IDS.productA, IDS.productC],
      newArrivals: [IDS.productB, IDS.productC],
      offers: [IDS.productA, IDS.productB, IDS.productC],
    }),
    listProductsByIds: async () => products,
    ...overrides,
  };
}

describe("storefront homepage service", () => {
  it("enforces banner activity windows and end-time exclusivity", () => {
    expect(isBannerCurrentlyActive(banner(), now)).toBe(true);
    expect(
      isBannerCurrentlyActive(banner({ startsAt: new Date("2026-07-30T11:00:00.000Z") }), now),
    ).toBe(false);
    expect(isBannerCurrentlyActive(banner({ endsAt: now }), now)).toBe(false);
    expect(isBannerCurrentlyActive(banner({ isActive: false }), now)).toBe(false);
  });

  it("sorts public navigation records, excludes inactive records, and sanitizes URLs", async () => {
    const result = await getStorefrontHome(
      repository({
        listBannerCandidates: async () => [
          banner({
            destinationUrl: "javascript:alert(1)",
            desktopMediaUrl: "http://unapproved.example/banner.webp",
          }),
          banner({
            id: "00000000-0000-4000-8000-000000000009",
            position: 1,
          }),
        ],
        listCategories: async () => [
          category(IDS.categoryA, "Lenses", 2),
          category(IDS.categoryB, "Cameras", 1),
          category("00000000-0000-4000-8000-000000000010", "Draft", 0, false),
        ],
        listBrands: async () => [
          brand(IDS.brandA, "Sony", 3),
          brand(IDS.brandB, "Canon", 1),
          brand("00000000-0000-4000-8000-000000000011", "Hidden", 0, false),
        ],
      }),
      { sectionLimit: 2, now },
    );

    expect(result.data.banners).toHaveLength(1);
    expect(result.data.categories.map((item) => item.name)).toEqual(["Cameras", "Lenses"]);
    expect(result.data.brands.map((item) => item.name)).toEqual(["Canon", "Sony"]);
  });

  it("deduplicates products across sections in priority order", async () => {
    const result = await getStorefrontHome(repository(), {
      sectionLimit: 2,
      now,
    });
    expect(result.data.productSections.featured.map((item) => item.id)).toEqual([
      IDS.productA,
      IDS.productB,
    ]);
    expect(result.data.productSections.bestSellers.map((item) => item.id)).toEqual([IDS.productC]);
    expect(result.data.productSections.newArrivals).toEqual([]);
    expect(result.data.productSections.offers).toEqual([]);
  });

  it("derives pricing output and rejects unavailable or invalid products", () => {
    expect(toPublicHomeProduct(product(IDS.productA))?.discountPercent).toBe(25);
    expect(toPublicHomeProduct(product(IDS.productA, { stock: 0 }))).toBeNull();
    expect(toPublicHomeProduct(product(IDS.productA, { isActive: false }))).toBeNull();
    expect(toPublicHomeProduct(product(IDS.productA, { categoryIsActive: false }))).toBeNull();
    expect(
      toPublicHomeProduct(product(IDS.productA, { mrp: "100.00", salePrice: "101.00" })),
    ).toBeNull();
  });

  it("handles an empty catalogue without fabricating data", async () => {
    const result = await getStorefrontHome(
      repository({
        listBannerCandidates: async () => [],
        listCategories: async () => [],
        listBrands: async () => [],
        listProductCandidates: async () => ({
          featured: [],
          bestSellers: [],
          newArrivals: [],
          offers: [],
        }),
        listProductsByIds: async () => [],
      }),
      { sectionLimit: 8, now },
    );
    expect(result.data).toEqual({
      banners: [],
      categories: [],
      brands: [],
      productSections: {
        featured: [],
        bestSellers: [],
        newArrivals: [],
        offers: [],
      },
    });
  });
});
