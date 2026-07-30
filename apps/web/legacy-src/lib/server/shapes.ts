export type Row = Record<string, unknown>;

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function asRow(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
}

export function publicStorageUrl(bucket: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (!base) return path;
  return `${base}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, "")}`;
}

export function legacyImage(rowValue: unknown) {
  const row = asRow(rowValue);
  const path =
    asString(row.path) ||
    asString(row.storage_path) ||
    asString(row.object_path) ||
    asString(row.url);
  const bucket = asString(row.bucket, process.env.PRODUCT_MEDIA_BUCKET || "product-media");

  return {
    _id: asString(row.id, path),
    name: asString(row.alt_text) || asString(row.name) || "Product image",
    key: path ? publicStorageUrl(bucket, path) : "",
    mimetype: asString(row.mime_type, "image/webp"),
    size: asNumber(row.size_bytes),
    thumbnail:
      asBoolean(row.is_primary) ||
      asString(row.kind).toLowerCase() === "thumbnail",
  };
}

export function legacyBrand(rowValue: unknown) {
  const row = asRow(rowValue);
  const logo =
    asString(row.logo_path) ||
    asString(row.object_path) ||
    asString(row.image_path) ||
    asString(row.logo_url);
  const status = asString(row.status).toLowerCase();
  const visibility = asString(row.visibility).toLowerCase();
  return {
    _id: asString(row.id),
    name: asString(row.name),
    code: asString(row.code) || asString(row.slug),
    slug: asString(row.slug),
    status: status ? (status === "active" ? "Active" : "Inactive") : "Active",
    visibility: visibility ? (visibility === "visible" ? "Show" : "Hide") : "Show",
    image: logo
      ? legacyImage({
          id: `${asString(row.id)}-logo`,
          path: logo,
          bucket: row.bucket,
          alt_text: asString(row.name),
          is_primary: true,
        })
      : undefined,
  };
}

export function legacyCategory(rowValue: unknown, brandRows: unknown[] = []) {
  const row = asRow(rowValue);
  const imagePath =
    asString(row.image_path) || asString(row.object_path) || asString(row.image_url);
  const status = asString(row.status).toLowerCase();
  const visibility = asString(row.visibility).toLowerCase();
  return {
    _id: asString(row.id),
    name: asString(row.name),
    code: asString(row.code) || asString(row.slug),
    slug: asString(row.slug),
    position: asNumber(row.position) || asNumber(row.sort_order),
    status: status ? (status === "active" ? "Active" : "Inactive") : "Active",
    visibility: visibility ? (visibility === "visible" ? "Show" : "Hide") : "Show",
    createdAt: asString(row.created_at),
    image: imagePath
      ? legacyImage({
          id: `${asString(row.id)}-image`,
          path: imagePath,
          bucket: row.bucket,
          alt_text: asString(row.name),
          is_primary: true,
        })
      : undefined,
    brands: brandRows.map((brand, index) => ({
      brand: legacyBrand(brand),
      position: index,
      status: "Active",
      visibility: "Show",
      _id: `${asString(row.id)}-${asString(asRow(brand).id)}`,
    })),
  };
}

export function legacyProduct(
  rowValue: unknown,
  relations: {
    brand?: unknown;
    category?: unknown;
    media?: unknown[];
    variants?: unknown[];
    inventory?: unknown;
  } = {},
) {
  const row = asRow(rowValue);
  const variant = asRow(relations.variants?.[0]);
  const inventory = asRow(relations.inventory);
  const actualPrice =
    asNumber(variant.compare_at_minor) / 100 ||
    asNumber(row.compare_at_price) ||
    asNumber(row.actual_price) ||
    asNumber(row.price) ||
    asNumber(variant.price_minor) / 100;
  const salePrice =
    asNumber(variant.price_minor) / 100 ||
    asNumber(row.sale_price) ||
    asNumber(row.price) ||
    actualPrice;
  const available = asNumber(
    inventory.available_quantity,
    asNumber(inventory.on_hand, asNumber(row.quantity)) -
      asNumber(inventory.reserved),
  );

  return {
    _id: asString(row.id),
    name: asString(row.name),
    slug: asString(row.slug),
    description: asString(row.description),
    keyFeatures: Array.isArray(row.key_features)
      ? row.key_features.join("\n")
      : asString(row.key_features),
    specification:
      row.specifications && typeof row.specifications === "object"
        ? JSON.stringify(row.specifications)
        : asString(row.specification),
    code: asString(variant.sku) || asString(row.sku) || asString(row.code),
    images: (relations.media ?? []).map(legacyImage),
    category: legacyCategory(relations.category),
    brand: legacyBrand(relations.brand),
    price: {
      actualPrice,
      salePrice,
      gst:
        asNumber(variant.tax_rate_bps) / 100 ||
        asNumber(row.gst_rate) ||
        asNumber(row.tax_rate),
      discountPrice: Math.max(0, actualPrice - salePrice),
      taxStatus:
        asString(variant.tax_mode, "inclusive") === "inclusive"
          ? "Inclusive"
          : "Exclusive",
    },
    variants: {
      productId: asString(variant.sku) || asString(row.sku),
      hsnNumber: asString(variant.hsn_code) || asString(row.hsn_code),
      barcode: asString(variant.barcode),
      color: asString(variant.color),
      colorLabel: asString(variant.color_label) || asString(variant.color),
      paymentMode:
        asString(row.payment_eligibility).toLowerCase() === "cod"
          ? "COD"
          : asString(row.payment_eligibility, "both").toLowerCase() === "both"
            ? "Both"
            : "Prepaid",
    },
    quantity: Math.max(0, available),
    lowStockMinQuantity: asNumber(inventory.low_stock_threshold),
    measuringUnits: asString(row.measuring_unit, asString(row.unit, "unit")),
    status: asString(row.status, "active") === "active" ? "Active" : "Inactive",
    visibility:
      asString(row.visibility, "visible") === "visible" ? "Show" : "Hide",
    position: asNumber(row.position) || asNumber(row.sort_order),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
    purchasedCount: asNumber(row.purchased_count),
  };
}

export function normalizeProductSlugId(slugId: string): string {
  const uuidMatch = slugId.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
  );
  if (uuidMatch?.[1]) return uuidMatch[1];
  const lastDash = slugId.lastIndexOf("-");
  return lastDash === -1 ? slugId : slugId.slice(lastDash + 1);
}
