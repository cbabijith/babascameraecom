import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { asc, eq, getDatabase, homeBanners } from "@babascamera/db";
import {
  getCatalogProduct,
  listBestSellingProducts,
  listBrands,
  listCatalogProductsPage,
  listCategories,
  listRelatedProducts,
} from "@/lib/data/storefront";
import { productImageUrl } from "@/lib/storage";

interface LegacyImage {
  _id: string;
  name: string;
  key: string;
  mimetype: string;
  size: number;
  thumbnail: boolean;
}

function image(key: string | null | undefined, name = "image"): LegacyImage {
  return {
    _id: key ?? name,
    name,
    key: productImageUrl(key),
    mimetype: "image/*",
    size: 0,
    thumbnail: false,
  };
}

function product(row: Awaited<ReturnType<typeof listCatalogProductsPage>>["products"][number]) {
  const actualPrice = Number(row.mrp);
  const salePrice = Number(row.salePrice);
  return {
    _id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? row.shortDescription ?? "",
    keyFeatures: row.shortDescription ?? "",
    specification: "",
    images: [image(row.image, row.name)],
    category: {
      _id: row.categorySlug ?? "uncategorized",
      name: row.categoryName ?? "Uncategorized",
      image: image(null, "category"),
      code: row.categorySlug ?? "uncategorized",
    },
    brand: {
      _id: row.brandSlug ?? "unbranded",
      name: row.brandName ?? "Baba's Camera",
      image: image(null, "brand"),
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

function success(payload: Record<string, unknown>) {
  return NextResponse.json({ success: true, message: "OK", ...payload });
}

function legacySort(value: string | null) {
  switch (value) {
    case "name_asc": return "newest" as const;
    case "price_asc": return "price-asc" as const;
    case "price_desc": return "price-desc" as const;
    case "popular": return "featured" as const;
    default: return "newest" as const;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const [resource, identifier] = path;
  const query = request.nextUrl.searchParams;

  if (resource === "health") return success({ result: { status: "ok" } });

  if (resource === "category") {
    const categories = await listCategories();
    if (identifier) {
      const found = categories.find((item) => item.id === identifier || item.slug === identifier);
      if (!found) return NextResponse.json({ success: false, message: "Category not found" }, { status: 404 });
      return success({ result: {
        _id: found.id, name: found.name, image: image(found.imageUrl, found.name),
        status: "Active", visibility: "Show", position: 0, createdAt: new Date().toISOString(), code: found.slug,
      } });
    }
    return success({ results: categories.map((item, position) => ({
      _id: item.id, name: item.name, image: image(item.imageUrl, item.name),
      status: "Active", visibility: "Show", position, createdAt: new Date().toISOString(), code: item.slug,
    })), totalCount: categories.length, currentPage: 1, totalPages: 1, latestCount: categories.length });
  }

  if (resource === "brand") {
    const brands = await listBrands();
    if (identifier && identifier !== "active") {
      const found = brands.find((item) => item.id === identifier || item.slug === identifier);
      if (!found) return NextResponse.json({ success: false, message: "Brand not found" }, { status: 404 });
      return success({ result: { _id: found.id, name: found.name, image: image(found.logoUrl, found.name), code: found.slug, status: "Active", visibility: "Show" } });
    }
    return success({ results: brands.map((item) => ({ _id: item.id, name: item.name, image: image(item.logoUrl, item.name), code: item.slug, status: "Active", visibility: "Show" })), totalCount: brands.length, currentPage: 1, totalPages: 1, latestCount: brands.length });
  }

  if (resource === "product") {
    if (identifier) {
      const found = await getCatalogProduct(identifier);
      if (!found) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
      const [relatedProducts] = await Promise.all([
        listRelatedProducts({ id: found.id, categorySlug: found.categorySlug }),
      ]);
      const listing = product(found);
      return success({
        result: {
          ...listing,
          sku: found.sku,
          specification: found.description ?? "",
          keyFeatures: found.shortDescription ?? "",
          averageRating: found.averageRating,
          reviewCount: found.reviewCount,
          images: found.images.map((item) => image(item.url, item.altText ?? found.name)),
          variants: found.variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            value: variant.value,
            additionalPrice: variant.additionalPrice,
            stock: variant.stock,
          })),
          relatedProducts: relatedProducts.map(product),
        },
      });
    }
    const categories = await listCategories();
    const brands = await listBrands();
    const categoryValue = query.get("category");
    const brandValue = query.get("brand");
    const search = query.get("search");
    const categorySlug = categories.find((item) => item.id === categoryValue || item.slug === categoryValue)?.slug;
    const brandSlug = brands.find((item) => item.id === brandValue || item.slug === brandValue)?.slug;
    const page = Math.max(Number(query.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(query.get("limit")) || 20, 1), 60);
    const result = await listCatalogProductsPage({
      ...(search ? { query: search } : {}),
      ...(categorySlug ? { categorySlug } : {}),
      ...(brandSlug ? { brandSlug } : {}),
      sort: legacySort(query.get("sort")),
      limit,
      offset: (page - 1) * limit,
    });
    return success({ results: result.products.map(product), totalCount: result.total, currentPage: page, totalPages: Math.max(Math.ceil(result.total / limit), 1), latestCount: result.products.length });
  }

  if (resource === "banner") {
    const rows = await getDatabase().select().from(homeBanners).where(eq(homeBanners.isActive, true)).orderBy(asc(homeBanners.position));
    const banners = rows.map((item) => ({
      _id: item.id, heading: item.headline ?? "", subHeading: item.subheading ?? "", tagline: "", ctaName: item.buttonLabel ?? "Shop now",
      type: "Hero", collections: [], status: "Active", visibility: "Show", position: item.position,
      mediaFile: image(item.desktopMediaUrl, item.altText ?? "Banner"), createdAt: item.createdAt.toISOString(), code: item.id,
    }));
    if (identifier) {
      const found = banners.find((item) => item._id === identifier);
      if (!found) return NextResponse.json({ success: false, message: "Banner not found" }, { status: 404 });
      return success({ result: found });
    }
    return success({ results: banners, totalCount: banners.length, currentPage: 1, totalPages: 1, latestCount: banners.length });
  }

  if (resource === "collection") {
    const products = await listBestSellingProducts(8);
    const items = products.map(product);
    return success({ results: items.length ? [{ _id: "featured", name: "Featured gear", value: 0, products: items, status: "Active", position: 0, createdAt: new Date().toISOString() }] : [], currentPage: 1, totalCount: items.length ? 1 : 0, totalPages: 1, latestCount: items.length ? 1 : 0 });
  }

  return NextResponse.json({ success: false, message: "Endpoint not available" }, { status: 404 });
}
