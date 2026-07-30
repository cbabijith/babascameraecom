import "server-only";

import {
  and,
  asc,
  brands,
  categories,
  desc,
  eq,
  getDatabase,
  gt,
  homeBanners,
  inArray,
  isNotNull,
  lt,
  notInArray,
  orderItems,
  orders,
  productImages,
  products,
  sql,
} from "@babascamera/db";

import type { HomeProductCandidates, HomeRepository } from "../types";

function boundedLimit(limit: number, maximum: number): number {
  return Math.min(Math.max(Math.trunc(limit), 1), maximum);
}

export const drizzleHomeRepository: HomeRepository = {
  async listBannerCandidates() {
    return getDatabase()
      .select({
        id: homeBanners.id,
        mediaType: homeBanners.mediaType,
        desktopMediaUrl: homeBanners.desktopMediaUrl,
        mobileMediaUrl: homeBanners.mobileMediaUrl,
        posterUrl: homeBanners.posterUrl,
        altText: homeBanners.altText,
        headline: homeBanners.headline,
        subheading: homeBanners.subheading,
        buttonLabel: homeBanners.buttonLabel,
        destinationUrl: homeBanners.destinationUrl,
        openInNewTab: homeBanners.openInNewTab,
        position: homeBanners.position,
        isActive: homeBanners.isActive,
        startsAt: homeBanners.startsAt,
        endsAt: homeBanners.endsAt,
      })
      .from(homeBanners)
      .where(eq(homeBanners.isActive, true))
      .orderBy(asc(homeBanners.position))
      .limit(10);
  },

  async listCategories(limit) {
    return getDatabase()
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        image: categories.imageUrl,
        parentId: categories.parentId,
        position: categories.sortOrder,
        isActive: categories.isActive,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name))
      .limit(boundedLimit(limit, 10));
  },

  async listBrands(limit) {
    return getDatabase()
      .select({
        id: brands.id,
        name: brands.name,
        slug: brands.slug,
        logo: brands.logoUrl,
        position: brands.position,
        isActive: brands.isActive,
      })
      .from(brands)
      .where(eq(brands.isActive, true))
      .orderBy(asc(brands.position), asc(brands.name))
      .limit(boundedLimit(limit, 16));
  },

  async listProductCandidates(limit): Promise<HomeProductCandidates> {
    const database = getDatabase();
    const pageSize = boundedLimit(limit, 48);
    const publicProduct = and(
      eq(products.isActive, true),
      eq(categories.isActive, true),
      gt(products.stock, 0),
    );
    const baseSelection = { id: products.id };

    const [featured, bestSellers, newArrivals, offers] = await Promise.all([
      database
        .select(baseSelection)
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(and(publicProduct, eq(products.isFeatured, true)))
        .orderBy(desc(products.updatedAt), desc(products.createdAt))
        .limit(pageSize),
      database
        .select({
          id: products.id,
          quantity: sql<number>`sum(${orderItems.quantity})`.mapWith(Number),
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(products, eq(orderItems.productId, products.id))
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(
          and(
            publicProduct,
            eq(orders.paymentStatus, "paid"),
            notInArray(orders.status, ["cancelled", "refunded"]),
            isNotNull(orderItems.productId),
          ),
        )
        .groupBy(products.id)
        .orderBy(desc(sql`sum(${orderItems.quantity})`), desc(products.updatedAt))
        .limit(pageSize),
      database
        .select(baseSelection)
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(publicProduct)
        .orderBy(desc(products.createdAt))
        .limit(pageSize),
      database
        .select(baseSelection)
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(and(publicProduct, lt(products.salePrice, products.mrp)))
        .orderBy(
          desc(sql`((${products.mrp} - ${products.salePrice}) / nullif(${products.mrp}, 0))`),
          desc(products.updatedAt),
        )
        .limit(pageSize),
    ]);

    return {
      featured: featured.map((row) => row.id),
      bestSellers: bestSellers.map((row) => row.id),
      newArrivals: newArrivals.map((row) => row.id),
      offers: offers.map((row) => row.id),
    };
  },

  async listProductsByIds(ids) {
    if (!ids.length) return [];
    return getDatabase()
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        brandName: brands.name,
        brandSlug: brands.slug,
        categoryName: categories.name,
        categorySlug: categories.slug,
        imageUrl: sql<string | null>`(
          select ${productImages.url}
          from ${productImages}
          where ${productImages.productId} = ${products.id}
          order by ${productImages.isPrimary} desc, ${productImages.position} asc
          limit 1
        )`,
        imageAltText: sql<string | null>`(
          select ${productImages.altText}
          from ${productImages}
          where ${productImages.productId} = ${products.id}
          order by ${productImages.isPrimary} desc, ${productImages.position} asc
          limit 1
        )`,
        mrp: products.mrp,
        salePrice: products.salePrice,
        stock: products.stock,
        isActive: products.isActive,
        categoryIsActive: categories.isActive,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, and(eq(products.brandId, brands.id), eq(brands.isActive, true)))
      .where(
        and(
          inArray(products.id, ids),
          eq(products.isActive, true),
          eq(categories.isActive, true),
          gt(products.stock, 0),
        ),
      );
  },
};
