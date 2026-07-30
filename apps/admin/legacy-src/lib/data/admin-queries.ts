import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@babas/database";
import type {
  AuditEntry,
  BankTransferSummary,
  BannerSummary,
  CatalogLookup,
  CollectionSummary,
  CouponSummary,
  CustomerSummary,
  InventoryEntry,
  OrderDetail,
  OrderItem,
  OrderStatusEvent,
  OrderSummary,
  PaymentAttempt,
  ProductSummary,
  ProductMediaSummary,
  RefundSummary,
  ReturnSummary,
  StoreConfiguration,
  VariantSummary,
} from "@/lib/data/types";

const PAGE_SIZE = 50;

export class AdminDataError extends Error {
  constructor(context: string, message: string) {
    super(`${context}: ${message}`);
    this.name = "AdminDataError";
  }
}

function assertNoError(error: { message: string } | null, context: string) {
  if (error) throw new AdminDataError(context, error.message);
}

function safeSearch(value?: string) {
  return value?.trim().replace(/[,%()]/g, " ").slice(0, 80) ?? "";
}

export async function getDashboardData() {
  const supabase = await createClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    orderCountResult,
    productCountResult,
    customerCountResult,
    recentOrdersResult,
    revenueResult,
    inventoryResult,
    pendingReturnsResult,
  ] = await Promise.all([
    supabase.from("staff_orders").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("staff_profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("staff_orders")
      .select(
        "id,order_number,customer_id,customer_name,customer_email,customer_phone,status,payment_status,fulfillment_status,payment_method,total_minor,paid_minor,refunded_minor,created_at,placed_at",
      )
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("staff_orders")
      .select("total_minor,paid_minor")
      .in("payment_status", ["paid", "partially_refunded", "refunded"])
      .gte("created_at", thirtyDaysAgo),
    supabase
      .from("staff_inventory_levels")
      .select("id,available_quantity,low_stock_threshold")
      .limit(1000),
    supabase
      .from("return_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "requested"),
  ]);

  [
    ["orders", orderCountResult.error],
    ["products", productCountResult.error],
    ["customers", customerCountResult.error],
    ["recent orders", recentOrdersResult.error],
    ["revenue", revenueResult.error],
    ["inventory", inventoryResult.error],
    ["returns", pendingReturnsResult.error],
  ].forEach(([context, error]) =>
    assertNoError(error as { message: string } | null, String(context)),
  );

  const revenueMinor = (revenueResult.data ?? []).reduce(
    (sum, order) => sum + Number(order.paid_minor || order.total_minor || 0),
    0,
  );
  const lowStockCount = (inventoryResult.data ?? []).filter(
    (level) => level.available_quantity <= level.low_stock_threshold,
  ).length;

  return {
    metrics: {
      orderCount: orderCountResult.count ?? 0,
      productCount: productCountResult.count ?? 0,
      customerCount: customerCountResult.count ?? 0,
      revenueMinor,
      lowStockCount,
      pendingReturns: pendingReturnsResult.count ?? 0,
    },
    recentOrders: (recentOrdersResult.data ?? []) as OrderSummary[],
  };
}

export async function getOrders(filters: {
  q?: string;
  status?: string;
  paymentStatus?: string;
}) {
  const supabase = await createClient();
  const search = safeSearch(filters.q);
  let query = supabase
    .from("staff_orders")
    .select(
      "id,order_number,customer_id,customer_name,customer_email,customer_phone,status,payment_status,fulfillment_status,payment_method,total_minor,paid_minor,refunded_minor,created_at,placed_at",
    )
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (search) query = query.ilike("order_number", `%${search}%`);
  if (filters.status) {
    query = query.eq("status", filters.status as Enums<"order_status">);
  }
  if (filters.paymentStatus) {
    query = query.eq(
      "payment_status",
      filters.paymentStatus as Enums<"payment_status">,
    );
  }

  const { data, error } = await query;
  assertNoError(error, "orders");
  return (data ?? []) as OrderSummary[];
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  const supabase = await createClient();
  const [orderResult, itemsResult, historyResult, paymentsResult] = await Promise.all([
    supabase.from("staff_orders").select("*").eq("id", orderId).maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", orderId).order("created_at"),
    supabase
      .from("order_status_history")
      .select("id,from_status,to_status,reason,actor_id,created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_payment_summaries")
      .select("id,order_id,provider,method,status,amount_minor,currency,created_at,updated_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false }),
  ]);

  assertNoError(orderResult.error, "order");
  assertNoError(itemsResult.error, "order items");
  assertNoError(historyResult.error, "order history");
  assertNoError(paymentsResult.error, "payment attempts");
  if (!orderResult.data) return null;

  return {
    ...(orderResult.data as unknown as Omit<
      OrderDetail,
      "items" | "statusHistory" | "paymentAttempts"
    >),
    items: (itemsResult.data ?? []) as OrderItem[],
    statusHistory: (historyResult.data ?? []) as OrderStatusEvent[],
    paymentAttempts: (paymentsResult.data ?? []) as PaymentAttempt[],
  };
}

export async function getProducts(filters: { q?: string; status?: string }) {
  const supabase = await createClient();
  const search = safeSearch(filters.q);
  let productQuery = supabase.from("products").select("*").order("created_at", {
    ascending: false,
  });

  if (search) {
    productQuery = productQuery.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
  }
  if (filters.status) {
    productQuery = productQuery.eq(
      "status",
      filters.status as Enums<"product_status">,
    );
  }

  const { data: products, error } = await productQuery.limit(PAGE_SIZE);
  assertNoError(error, "products");
  if (!products?.length) return [] as ProductSummary[];

  const productIds = products.map((product) => product.id);
  const brandIds = [...new Set(products.map((product) => product.brand_id))];
  const categoryIds = [...new Set(products.map((product) => product.primary_category_id))];
  const [variantsResult, brandsResult, categoriesResult, stockResult] = await Promise.all([
    supabase.from("staff_product_variants").select("*").in("product_id", productIds),
    supabase.from("brands").select("id,name").in("id", brandIds),
    supabase.from("categories").select("id,name").in("id", categoryIds),
    supabase
      .from("staff_inventory_levels")
      .select("variant_id,available_quantity")
      .in(
        "variant_id",
        (
          await supabase
            .from("staff_product_variants")
            .select("id")
            .in("product_id", productIds)
        ).data?.map((variant) => variant.id) ?? [],
      ),
  ]);
  assertNoError(variantsResult.error, "product variants");
  assertNoError(brandsResult.error, "product brands");
  assertNoError(categoriesResult.error, "product categories");
  assertNoError(stockResult.error, "product inventory");

  const brands = new Map((brandsResult.data ?? []).map((brand) => [brand.id, brand.name]));
  const categories = new Map(
    (categoriesResult.data ?? []).map((category) => [category.id, category.name]),
  );
  const variants = (variantsResult.data ?? []) as VariantSummary[];
  const stockByVariant = new Map<string, number>();
  (stockResult.data ?? []).forEach((level) => {
    stockByVariant.set(
      level.variant_id,
      (stockByVariant.get(level.variant_id) ?? 0) + level.available_quantity,
    );
  });

  return products.map((product) => {
    const productVariants = variants.filter((variant) => variant.product_id === product.id);
    return {
      ...(product as unknown as Omit<
        ProductSummary,
        "brandName" | "categoryName" | "defaultVariant" | "variantCount" | "availableQuantity"
      >),
      brandName: brands.get(product.brand_id) ?? "Unknown brand",
      categoryName: categories.get(product.primary_category_id) ?? "Uncategorised",
      defaultVariant:
        productVariants.find((variant) => variant.is_default) ?? productVariants[0] ?? null,
      variantCount: productVariants.length,
      availableQuantity: productVariants.reduce(
        (sum, variant) => sum + (stockByVariant.get(variant.id) ?? 0),
        0,
      ),
    };
  });
}

export async function getProduct(productId: string) {
  const supabase = await createClient();
  const [productResult, variantsResult, mediaResult] = await Promise.all([
    supabase.from("products").select("*").eq("id", productId).maybeSingle(),
    supabase
      .from("staff_product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("created_at"),
    supabase
      .from("product_media")
      .select("id,media_id,media_role,alt_text,position")
      .eq("product_id", productId)
      .order("position")
      .order("created_at"),
  ]);
  assertNoError(productResult.error, "product");
  assertNoError(variantsResult.error, "product variants");
  assertNoError(mediaResult.error, "product media");
  const mediaIds = (mediaResult.data ?? []).map((item) => item.media_id);
  const { data: assets, error: assetError } = mediaIds.length
    ? await supabase
        .from("media_assets")
        .select("id,bucket,object_path,mime_type")
        .in("id", mediaIds)
        .is("deleted_at", null)
    : { data: [], error: null };
  assertNoError(assetError, "product media assets");
  const assetById = new Map((assets ?? []).map((asset) => [asset.id, asset]));
  const media = (mediaResult.data ?? []).flatMap((link) => {
    const asset = assetById.get(link.media_id);
    if (!asset) return [];
    const { data } = supabase.storage
      .from(asset.bucket)
      .getPublicUrl(asset.object_path);
    return [
      {
        ...link,
        bucket: asset.bucket,
        object_path: asset.object_path,
        mime_type: asset.mime_type,
        publicUrl: data.publicUrl,
      } satisfies ProductMediaSummary,
    ];
  });
  return {
    product: productResult.data,
    variants: (variantsResult.data ?? []) as VariantSummary[],
    media,
  };
}

export async function getCatalogLookups(table: "brands" | "categories") {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("position")
    .order("name");
  assertNoError(error, table);
  return (data ?? []) as CatalogLookup[];
}

export async function getInventory() {
  const supabase = await createClient();
  const levelsResult = await supabase
    .from("staff_inventory_levels")
    .select("*")
    .order("updated_at", { ascending: false });
  assertNoError(levelsResult.error, "inventory");

  return (levelsResult.data ?? []).map((level) => {
    return {
      ...(level as unknown as Omit<
        InventoryEntry,
        "sku" | "productName" | "locationName" | "locationCode"
      >),
      sku: level.sku,
      productName: level.product_name,
      locationName: level.location_name,
      locationCode: level.location_code,
    };
  });
}

export async function getInventoryAdjustmentOptions() {
  const supabase = await createClient();
  const [variantsResult, locationsResult, productsResult] = await Promise.all([
    supabase
      .from("staff_product_variants")
      .select("id,product_id,sku,is_active")
      .eq("is_active", true)
      .order("sku"),
    supabase
      .from("inventory_locations")
      .select("id,name,code")
      .eq("is_active", true)
      .order("priority"),
    supabase.from("products").select("id,name").neq("status", "archived"),
  ]);
  assertNoError(variantsResult.error, "inventory variants");
  assertNoError(locationsResult.error, "inventory locations");
  assertNoError(productsResult.error, "inventory products");
  const productNames = new Map(
    (productsResult.data ?? []).map((product) => [product.id, product.name]),
  );
  return {
    variants: (variantsResult.data ?? []).map((variant) => ({
      id: variant.id,
      label: `${variant.sku} — ${productNames.get(variant.product_id) ?? "Unknown product"}`,
    })),
    locations: locationsResult.data ?? [],
  };
}

export async function getCustomers(q?: string) {
  const supabase = await createClient();
  const search = safeSearch(q);
  let profileQuery = supabase.from("staff_profiles").select("*").order("created_at", {
    ascending: false,
  });
  if (search) {
    profileQuery = profileQuery.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
    );
  }

  const { data: profiles, error } = await profileQuery.limit(PAGE_SIZE);
  assertNoError(error, "customers");
  if (!profiles?.length) return [] as CustomerSummary[];
  const ids = profiles.map((profile) => profile.id);
  const ordersResult = await supabase
    .from("staff_orders")
    .select("customer_id,total_minor,payment_status")
    .in("customer_id", ids);
  assertNoError(ordersResult.error, "customer orders");

  return profiles.map((profile) => {
    const orders = (ordersResult.data ?? []).filter((order) => order.customer_id === profile.id);
    return {
      ...(profile as unknown as Omit<CustomerSummary, "roles" | "orderCount" | "spendMinor">),
      roles: profile.roles,
      orderCount: orders.length,
      spendMinor: orders
        .filter((order) => ["paid", "partially_refunded", "refunded"].includes(order.payment_status))
        .reduce((sum, order) => sum + Number(order.total_minor), 0),
    };
  });
}

export async function getPayments() {
  const supabase = await createClient();
  const { data: attempts, error } = await supabase
    .from("customer_payment_summaries")
    .select("id,order_id,provider,method,status,amount_minor,currency,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  assertNoError(error, "payments");
  const orderIds = [...new Set((attempts ?? []).map((attempt) => attempt.order_id))];
  const { data: orders, error: orderError } = orderIds.length
    ? await supabase.from("orders").select("id,order_number").in("id", orderIds)
    : { data: [], error: null };
  assertNoError(orderError, "payment orders");
  const orderNumbers = new Map((orders ?? []).map((order) => [order.id, order.order_number]));

  return (attempts ?? []).map((attempt) => ({
    ...(attempt as PaymentAttempt),
    orderNumber: orderNumbers.get(attempt.order_id) ?? "Unknown order",
  }));
}

export async function getBankTransfers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bank_transfer_submissions")
    .select("*")
    .order("submitted_at", { ascending: false });
  assertNoError(error, "bank transfers");
  const orderIds = [...new Set((data ?? []).map((transfer) => transfer.order_id))];
  const { data: orders, error: orderError } = orderIds.length
    ? await supabase.from("orders").select("id,order_number").in("id", orderIds)
    : { data: [], error: null };
  assertNoError(orderError, "bank transfer orders");
  const orderNumbers = new Map((orders ?? []).map((order) => [order.id, order.order_number]));
  return Promise.all(
    (data ?? []).map(async (transfer) => {
      const { data: signedProof } = await supabase.storage
        .from(transfer.proof_bucket)
        .createSignedUrl(transfer.proof_path, 300);
      return {
        ...(transfer as unknown as BankTransferSummary),
        orderNumber: orderNumbers.get(transfer.order_id) ?? "Unknown order",
        proofUrl: signedProof?.signedUrl ?? null,
      };
    }),
  );
}

export async function getCoupons() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  assertNoError(error, "coupons");
  return (data ?? []) as CouponSummary[];
}

export async function getBanners() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("banners").select("*").order("position");
  assertNoError(error, "banners");
  return (data ?? []) as BannerSummary[];
}

export async function getCollections() {
  const supabase = await createClient();
  const [collectionsResult, productsResult] = await Promise.all([
    supabase.from("collections").select("*").order("position"),
    supabase
      .from("collection_products")
      .select("collection_id,product_id,position")
      .order("position"),
  ]);
  assertNoError(collectionsResult.error, "collections");
  assertNoError(productsResult.error, "collection products");
  const productIds = [...new Set((productsResult.data ?? []).map((item) => item.product_id))];
  const { data: productRows, error: productError } = productIds.length
    ? await supabase.from("products").select("id,name").in("id", productIds)
    : { data: [], error: null };
  assertNoError(productError, "collection product names");
  const productNames = new Map((productRows ?? []).map((product) => [product.id, product.name]));
  return (collectionsResult.data ?? []).map((collection) => ({
    ...(collection as unknown as CollectionSummary),
    productCount: (productsResult.data ?? []).filter(
      (product) => product.collection_id === collection.id,
    ).length,
    products: (productsResult.data ?? [])
      .filter((product) => product.collection_id === collection.id)
      .map((product) => ({
        id: product.product_id,
        name: productNames.get(product.product_id) ?? "Unknown product",
        position: product.position,
      })),
  }));
}

export async function getPromotionProductOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,name,code")
    .neq("status", "archived")
    .order("name")
    .limit(500);
  assertNoError(error, "promotion products");
  return data ?? [];
}

export async function getReturnsAndRefunds() {
  const supabase = await createClient();
  const [returnsResult, refundsResult] = await Promise.all([
    supabase.from("return_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("refunds").select("*").order("created_at", { ascending: false }),
  ]);
  assertNoError(returnsResult.error, "returns");
  assertNoError(refundsResult.error, "refunds");
  const orderIds = [
    ...new Set([
      ...(returnsResult.data ?? []).map((item) => item.order_id),
      ...(refundsResult.data ?? []).map((item) => item.order_id),
    ]),
  ];
  const { data: orders, error: orderError } = orderIds.length
    ? await supabase.from("orders").select("id,order_number,customer_name").in("id", orderIds)
    : { data: [], error: null };
  assertNoError(orderError, "return orders");
  const orderMap = new Map((orders ?? []).map((order) => [order.id, order]));

  return {
    returns: (returnsResult.data ?? []).map((item) => ({
      ...(item as unknown as ReturnSummary),
      orderNumber: orderMap.get(item.order_id)?.order_number ?? "Unknown order",
      customerName: orderMap.get(item.order_id)?.customer_name ?? "Unknown customer",
    })),
    refunds: (refundsResult.data ?? []).map((item) => ({
      ...(item as unknown as RefundSummary),
      orderNumber: orderMap.get(item.order_id)?.order_number ?? "Unknown order",
    })),
  };
}

export async function getRefundableOrders() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_orders")
    .select("id,order_number,customer_name,paid_minor,refunded_minor")
    .in("payment_status", ["paid", "partially_refunded"])
    .order("created_at", { ascending: false })
    .limit(100);
  assertNoError(error, "refundable orders");
  return (data ?? []).filter(
    (order) => Number(order.paid_minor) - Number(order.refunded_minor) > 0,
  );
}

export async function getStoreConfiguration(): Promise<StoreConfiguration> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select("namespace,setting_key,value")
    .in("namespace", ["checkout", "store"]);
  assertNoError(error, "settings");
  const settings = new Map(
    (data ?? []).map((setting) => [
      `${setting.namespace}.${setting.setting_key}`,
      setting.value,
    ]),
  );
  const objectValue = (key: string) => {
    const value = settings.get(key);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  };
  const paymentMethods = objectValue("checkout.payment_methods");
  const razorpay =
    paymentMethods.razorpay &&
    typeof paymentMethods.razorpay === "object" &&
    !Array.isArray(paymentMethods.razorpay)
      ? (paymentMethods.razorpay as Record<string, unknown>)
      : {};
  const bankTransfer =
    paymentMethods.bank_transfer &&
    typeof paymentMethods.bank_transfer === "object" &&
    !Array.isArray(paymentMethods.bank_transfer)
      ? (paymentMethods.bank_transfer as Record<string, unknown>)
      : {};
  const cod =
    paymentMethods.cod &&
    typeof paymentMethods.cod === "object" &&
    !Array.isArray(paymentMethods.cod)
      ? (paymentMethods.cod as Record<string, unknown>)
      : {};
  const delivery = objectValue("checkout.delivery");
  const profile = objectValue("store.profile");
  const booleanValue = (
    object: Record<string, unknown>,
    key: string,
    fallback: boolean,
  ) => (typeof object[key] === "boolean" ? object[key] : fallback);
  const numberValue = (
    object: Record<string, unknown>,
    key: string,
    fallback: number,
  ) => (typeof object[key] === "number" ? object[key] : fallback);
  const stringValue = (
    object: Record<string, unknown>,
    key: string,
    fallback: string,
  ) => (typeof object[key] === "string" ? object[key] : fallback);

  return {
    codEnabled: booleanValue(cod, "enabled", true),
    codMinimumMinor: numberValue(cod, "minimum_minor", 0),
    codMaximumMinor: numberValue(cod, "maximum_minor", 2_000_000),
    onlinePaymentEnabled: booleanValue(razorpay, "enabled", false),
    onlinePaymentFeeBps: numberValue(razorpay, "gateway_fee_bps", 0),
    bankTransferEnabled: booleanValue(bankTransfer, "enabled", true),
    freeShippingEnabled: booleanValue(delivery, "enable_free_delivery", false),
    freeShippingThresholdMinor: numberValue(
      delivery,
      "free_delivery_threshold_minor",
      1_000_000,
    ),
    flatShippingMinor: numberValue(delivery, "flat_charge_minor", 0),
    storeName: stringValue(profile, "name", "Baba's Camera"),
    currency: stringValue(profile, "currency", "INR"),
    supportEmail: stringValue(profile, "support_email", ""),
    supportPhone: stringValue(profile, "support_phone", ""),
  };
}

export async function getAuditLog() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  assertNoError(error, "audit log");
  const actorIds = [
    ...new Set((data ?? []).flatMap((entry) => (entry.actor_id ? [entry.actor_id] : []))),
  ];
  const { data: profiles, error: profileError } = actorIds.length
    ? await supabase.from("profiles").select("id,full_name,email").in("id", actorIds)
    : { data: [], error: null };
  assertNoError(profileError, "audit actors");
  const names = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.full_name || profile.email || "Administrator",
    ]),
  );
  return (data ?? []).map((entry) => ({
    ...(entry as unknown as AuditEntry),
    actorName: entry.actor_id ? (names.get(entry.actor_id) ?? "Unknown user") : "System",
  }));
}
