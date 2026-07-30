import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@babas/database";
import { createClient } from "@/lib/supabase/server";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";
import {
  asBoolean,
  asNumber,
  asRow,
  asString,
  legacyBrand,
  legacyCategory,
  legacyImage,
  legacyProduct,
  type Row,
} from "./shapes";

export class CommerceDataError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "CommerceDataError";
  }
}

type ProductFilters = {
  id?: string;
  categoryId?: string;
  brandId?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

type PublicTable = keyof Database["public"]["Tables"];
type PublicView = keyof Database["public"]["Views"];

async function rows(
  supabase: SupabaseClient<Database>,
  table: PublicTable,
): Promise<Row[]> {
  const { data, error } = await supabase.from(table).select("*");
  if (error) throw new CommerceDataError(`Unable to read ${table}.`, error);
  return (data ?? []) as Row[];
}

async function viewRows(
  supabase: SupabaseClient<Database>,
  view: PublicView,
): Promise<Row[]> {
  const { data, error } = await supabase.from(view).select("*");
  if (error) throw new CommerceDataError(`Unable to read ${view}.`, error);
  return (data ?? []) as Row[];
}

async function publicVariantRows(
  supabase: SupabaseClient<Database>,
): Promise<Row[]> {
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id,product_id,sku,barcode,hsn_code,option_values,color,color_label,price_minor,compare_at_minor,currency,tax_rate_bps,tax_mode,is_default,is_active,created_at,updated_at",
    );
  if (error) throw new CommerceDataError("Unable to read product variants.", error);
  return (data ?? []) as Row[];
}

function isPublished(row: Row): boolean {
  const status = asString(row.status).toLowerCase();
  const visibility = asString(row.visibility).toLowerCase();
  return (
    asBoolean(row.is_active, status ? status === "active" : true) &&
    asBoolean(row.is_visible, visibility ? visibility === "visible" : true) &&
    !row.deleted_at
  );
}

export async function loadCatalog(supabaseArg?: SupabaseClient<Database>) {
  if (!supabaseArg && !hasSupabasePublicConfig()) {
    return {
      products: [],
      rawProducts: [],
      brands: [],
      rawBrands: [],
      categories: [],
      rawCategories: [],
    };
  }
  const supabase = supabaseArg ?? (await createClient());
  const [
    productRows,
    brandRowsValue,
    categoryRowsValue,
    productMediaRows,
    assetRows,
    variantRows,
    inventoryRows,
  ] =
    await Promise.all([
      rows(supabase, "products"),
      rows(supabase, "brands"),
      rows(supabase, "categories"),
      rows(supabase, "product_media"),
      rows(supabase, "media_assets"),
      publicVariantRows(supabase),
      viewRows(supabase, "catalog_inventory"),
    ]);

  const assets = new Map(assetRows.map((row) => [asString(row.id), row]));
  const brandRows = brandRowsValue.map((row) => ({
    ...(assets.get(asString(row.logo_media_id)) ?? {}),
    ...row,
  }));
  const categoryRows = categoryRowsValue.map((row) => ({
    ...(assets.get(asString(row.image_media_id)) ?? {}),
    ...row,
  }));
  const mediaRows = productMediaRows.map((row) => ({
    ...(assets.get(asString(row.media_id)) ?? {}),
    ...row,
  }));
  const brands = new Map(brandRows.map((row) => [asString(row.id), row]));
  const categories = new Map(categoryRows.map((row) => [asString(row.id), row]));
  const mediaByProduct = new Map<string, Row[]>();
  const variantsByProduct = new Map<string, Row[]>();
  const inventoryByVariant = new Map(
    inventoryRows.map((row) => [asString(row.variant_id), row]),
  );

  for (const row of mediaRows) {
    const productId = asString(row.product_id);
    const list = mediaByProduct.get(productId) ?? [];
    list.push(row);
    mediaByProduct.set(productId, list);
  }
  for (const row of [...variantRows].sort(
    (a, b) => Number(Boolean(b.is_default)) - Number(Boolean(a.is_default)),
  )) {
    const productId = asString(row.product_id);
    const list = variantsByProduct.get(productId) ?? [];
    list.push(row);
    variantsByProduct.set(productId, list);
  }
  const products = productRows.filter(isPublished).map((row) => {
    const id = asString(row.id);
    const variants = variantsByProduct.get(id) ?? [];
    const inventory = variants.reduce<Row>(
      (total, variant) => ({
        available_quantity:
          asNumber(total.available_quantity) +
          asNumber(inventoryByVariant.get(asString(variant.id))?.available_quantity),
        low_stock_threshold: asNumber(total.low_stock_threshold),
      }),
      {},
    );
    return legacyProduct(row, {
      brand: brands.get(asString(row.brand_id)),
      category: categories.get(asString(row.primary_category_id)),
      media: (mediaByProduct.get(id) ?? []).sort(
        (a, b) => asNumber(a.position) - asNumber(b.position),
      ),
      variants,
      inventory,
    });
  });

  return {
    products,
    rawProducts: productRows,
    brands: brandRows.filter(isPublished).map(legacyBrand),
    rawBrands: brandRows,
    categories: categoryRows.filter(isPublished).map((category) => {
      const brandIds = new Set(
        productRows
          .filter(
            (product) =>
              asString(product.primary_category_id) === asString(category.id),
          )
          .map((product) => asString(product.brand_id)),
      );
      return legacyCategory(
        category,
        brandRows.filter((brand) => brandIds.has(asString(brand.id))),
      );
    }),
    rawCategories: categoryRows,
  };
}

export async function listProducts(filters: ProductFilters = {}) {
  const catalog = await loadCatalog();
  let products = catalog.products;

  if (filters.id) {
    products = products.filter(
      (product) => product._id === filters.id || product.slug === filters.id,
    );
  }
  if (filters.categoryId) {
    products = products.filter((product) => product.category?._id === filters.categoryId);
  }
  if (filters.brandId) {
    products = products.filter((product) => product.brand?._id === filters.brandId);
  }
  if (filters.search?.trim()) {
    const needle = filters.search.trim().toLowerCase();
    products = products.filter((product) =>
      [product.name, product.code, product.brand?.name, product.category?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }

  const sort = filters.sort ?? "newest";
  products = [...products].sort((a, b) => {
    if (sort === "name_asc") return a.name.localeCompare(b.name);
    if (sort === "name_desc") return b.name.localeCompare(a.name);
    if (sort === "price_asc") return a.price.salePrice - b.price.salePrice;
    if (sort === "price_desc") return b.price.salePrice - a.price.salePrice;
    if (sort === "popular") return (b.purchasedCount ?? 0) - (a.purchasedCount ?? 0);
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  const page = Math.max(1, filters.page ?? 1);
  const limit = filters.limit === -1 ? products.length || 1 : Math.max(1, filters.limit ?? 20);
  const totalCount = products.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const results = products.slice((page - 1) * limit, page * limit);

  return { results, page, limit, totalCount, totalPages };
}

export async function listBrands() {
  const catalog = await loadCatalog();
  return catalog.brands;
}

export async function getBrand(id: string) {
  const brands = await listBrands();
  return brands.find((brand) => brand._id === id || brand.slug === id) ?? null;
}

export async function listCategories(brandId?: string) {
  const catalog = await loadCatalog();
  if (!brandId) return catalog.categories;
  const categoryIds = new Set(
    catalog.products
      .filter((product) => product.brand?._id === brandId)
      .map((product) => product.category?._id),
  );
  return catalog.categories.filter((category) => categoryIds.has(category._id));
}

export async function getCategory(id: string) {
  const categories = await listCategories();
  return categories.find((category) => category._id === id || category.slug === id) ?? null;
}

export async function listBanners(type?: string) {
  if (!hasSupabasePublicConfig()) return [];
  const supabase = await createClient();
  const bannerRows = (await rows(supabase, "banners")).filter(isPublished);
  const [assetRows, bannerProductRows] = await Promise.all([
    rows(supabase, "media_assets"),
    rows(supabase, "banner_products"),
  ]);
  const assets = new Map(assetRows.map((row) => [asString(row.id), row]));
  return bannerRows
    .filter(
      (row) =>
        !type ||
        asString(row.banner_type).toLowerCase() === type.toLowerCase(),
    )
    .sort((a, b) => asNumber(a.position) - asNumber(b.position))
    .map((row) => ({
      _id: asString(row.id),
      heading: asString(row.heading) || asString(row.title),
      subHeading: asString(row.subheading) || asString(row.subtitle),
      tagline: asString(row.tagline),
      ctaName: asString(row.cta_label, "Shop now"),
      ctaUrl: asString(row.cta_href),
      type: asString(row.banner_type, "Hero"),
      collections: [],
      status: "Active",
      visibility: "Show",
      position: asNumber(row.position),
      mediaFile: legacyImage({
        id: `${asString(row.id)}-media`,
        ...assets.get(asString(row.media_id)),
        alt_text: asString(row.heading) || asString(row.title),
        is_primary: true,
      }),
      createdAt: asString(row.created_at),
      code: asString(row.code) || asString(row.slug),
      productIds: bannerProductRows
        .filter((item) => asString(item.banner_id) === asString(row.id))
        .map((item) => asString(item.product_id)),
    }));
}

export async function getBanner(id: string) {
  const banners = await listBanners();
  return banners.find((banner) => banner._id === id) ?? null;
}

export async function listCollections() {
  if (!hasSupabasePublicConfig()) return [];
  const supabase = await createClient();
  const collectionRows = (await rows(supabase, "collections")).filter(isPublished);
  const collectionProductRows = await rows(supabase, "collection_products");
  const catalog = await loadCatalog(supabase);

  return collectionRows.map((row) => {
    const productIds = collectionProductRows
      .filter((item) => asString(item.collection_id) === asString(row.id))
      .map((item) => asString(item.product_id));
    return {
      _id: asString(row.id),
      name: asString(row.name),
      value: asNumber(row.discount_bps) / 100,
      products: productIds.length
        ? catalog.products.filter((product) => productIds.includes(product._id))
        : [],
      status: "Active",
      position: asNumber(row.position),
      createdAt: asString(row.created_at),
    };
  });
}

export async function getStoreSettings(scope?: string) {
  if (!hasSupabasePublicConfig()) return {};
  const supabase = await createClient();
  const normalizedScope = scope?.trim().toLowerCase();
  const namespace = normalizedScope === "delivery" ? "checkout" : normalizedScope;
  let query = supabase.from("public_store_settings").select("*");
  if (namespace) query = query.eq("namespace", namespace);
  if (normalizedScope === "delivery") {
    query = query.eq("setting_key", "delivery");
  }
  const { data, error } = await query;
  if (error) throw new CommerceDataError("Unable to read store settings.", error);

  const output: Record<string, unknown> = {};
  for (const value of data ?? []) {
    const row = asRow(value);
    output[asString(row.setting_key)] = row.value;
  }
  if (normalizedScope === "delivery") {
    const delivery = asRow(output.delivery);
    return {
      enableFreeDelivery: asBoolean(delivery.enable_free_delivery),
      deliveryChargeFlat: asNumber(delivery.flat_charge_minor) / 100,
      freeDeliveryThreshold:
        asNumber(delivery.free_delivery_threshold_minor) / 100,
    };
  }
  return output;
}
