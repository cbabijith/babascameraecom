import type { CatalogProduct, ProductDetail } from "@/features/catalog/services/catalog-service";
import { productImageUrl } from "@/lib/storage";

/**
 * Builders for the legacy storefront product payload. Shared by the
 * /api/storefront/legacy route and the product page's server component so a
 * server-rendered initial payload is byte-identical to the API response the
 * client would otherwise refetch.
 */

export interface LegacyImage {
  _id: string;
  name: string;
  key: string;
  mimetype: string;
  size: number;
  thumbnail: boolean;
}

export function legacyImage(key: string | null | undefined, name = "image"): LegacyImage {
  return {
    _id: key ?? name,
    name,
    key: productImageUrl(key),
    mimetype: "image/*",
    size: 0,
    thumbnail: false,
  };
}

export function legacyProductCard(row: CatalogProduct) {
  const actualPrice = Number(row.mrp);
  const salePrice = Number(row.salePrice);
  return {
    _id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? row.shortDescription ?? "",
    keyFeatures: row.shortDescription ?? "",
    specification: "",
    images: [legacyImage(row.image, row.name)],
    category: {
      _id: row.categorySlug ?? "uncategorized",
      name: row.categoryName ?? "Uncategorized",
      image: legacyImage(null, "category"),
      code: row.categorySlug ?? "uncategorized",
    },
    brand: {
      _id: row.brandSlug ?? "unbranded",
      name: row.brandName ?? "Baba's Camera",
      image: legacyImage(null, "brand"),
      code: row.brandSlug ?? "unbranded",
    },
    price: {
      actualPrice,
      salePrice,
      gst: 0,
      discountPrice: Math.max(actualPrice - salePrice, 0),
      taxStatus: "Inclusive",
    },
    quantity: row.stock,
    lowStockMinQuantity: 0,
    status: "Active",
    visibility: "Show",
    createdAt: new Date().toISOString(),
    code: row.slug,
  };
}

export function legacyProductDetail(
  found: ProductDetail,
  relatedProducts: CatalogProduct[],
) {
  return {
    ...legacyProductCard(found),
    sku: found.sku,
    specification: found.description ?? "",
    keyFeatures: found.shortDescription ?? "",
    averageRating: found.averageRating,
    reviewCount: found.reviewCount,
    images: found.images.map((item) => legacyImage(item.url, item.altText ?? found.name)),
    variants: found.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      value: variant.value,
      additionalPrice: variant.additionalPrice,
      stock: variant.stock,
    })),
    relatedProducts: relatedProducts.map(legacyProductCard),
  };
}
