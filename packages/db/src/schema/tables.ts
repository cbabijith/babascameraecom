import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  couponRedemptionStatusEnum,
  couponTypeEnum,
  emailOutboxStatusEnum,
  inventoryReservationStatusEnum,
  homeBannerMediaTypeEnum,
  orderStatusEnum,
  paymentEventOutcomeEnum,
  paymentMethodEnum,
  paymentStatusEnum,
  refundStatusEnum,
  userRoleEnum,
} from "./enums";
import type { JsonObject, JsonValue, ShippingAddressSnapshot } from "./json";

const baseColumns = () => ({
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    ...baseColumns(),
    name: text("name"),
    fullName: text("full_name"),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    phone: text("phone"),
    role: userRoleEnum("role").default("customer").notNull(),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => [
    index("users_role_idx").on(table.role),
    index("users_active_role_idx").on(table.isActive, table.role),
    check("users_email_not_blank", sql`length(trim(${table.email})) > 3`),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_token_idx").on(table.token),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date", withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: "date", withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    issuer: text("issuer"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    uniqueIndex("accounts_provider_account_idx").on(table.providerId, table.accountId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("verifications_identifier_idx").on(table.identifier),
  ],
);

export const addresses = pgTable(
  "addresses",
  {
    ...baseColumns(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    pincode: text("pincode").notNull(),
    country: text("country").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
  },
  (table) => [
    index("addresses_user_id_idx").on(table.userId),
    uniqueIndex("addresses_one_default_per_user_idx")
      .on(table.userId)
      .where(sql`${table.isDefault} = true`),
    check("addresses_label_not_blank", sql`length(trim(${table.label})) > 0`),
    check("addresses_line1_not_blank", sql`length(trim(${table.line1})) > 0`),
    check("addresses_pincode_not_blank", sql`length(trim(${table.pincode})) > 0`),
  ],
);

export const brands = pgTable(
  "brands",
  {
    ...baseColumns(),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
    logoUrl: text("logo_url"),
    description: text("description"),
    position: integer("position").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => [
    index("brands_position_idx").on(table.position),
    index("brands_active_idx").on(table.isActive),
    check("brands_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("brands_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
    check("brands_position_nonnegative", sql`${table.position} >= 0`),
  ],
);

export const categories = pgTable(
  "categories",
  {
    ...baseColumns(),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    imageUrl: text("image_url"),
    description: text("description"),
    sortOrder: integer("sort_order").default(0).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => [
    index("categories_parent_id_idx").on(table.parentId),
    index("categories_parent_sort_order_idx").on(table.parentId, table.sortOrder),
    index("categories_active_idx").on(table.isActive),
    check(
      "categories_not_own_parent",
      sql`${table.parentId} is null or ${table.parentId} <> ${table.id}`,
    ),
    check("categories_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("categories_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
    check("categories_sort_order_nonnegative", sql`${table.sortOrder} >= 0`),
  ],
);

export const products = pgTable(
  "products",
  {
    ...baseColumns(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    shortDescription: text("short_description"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    sku: text("sku").notNull().unique(),
    mrp: numeric("mrp", { precision: 10, scale: 2 }).notNull(),
    salePrice: numeric("sale_price", { precision: 10, scale: 2 }).notNull(),
    costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
    gstRate: numeric("gst_rate", { precision: 5, scale: 2 }),
    priceIncludesGst: boolean("price_includes_gst").default(true).notNull(),
    stock: integer("stock").default(0).notNull(),
    lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
    weight: numeric("weight", { precision: 6, scale: 2 }),
    shippingFee: numeric("shipping_fee", { precision: 10, scale: 2 }),
    warranty: text("warranty"),
    youtubeUrl: text("youtube_url"),
    isFeatured: boolean("is_featured").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
  },
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    index("products_brand_id_idx").on(table.brandId),
    index("products_active_featured_idx").on(table.isActive, table.isFeatured),
    index("products_stock_idx").on(table.stock),
    check("products_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("products_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'`),
    check("products_sku_not_blank", sql`length(trim(${table.sku})) > 0`),
    check("products_mrp_nonnegative", sql`${table.mrp} >= 0`),
    check("products_sale_price_nonnegative", sql`${table.salePrice} >= 0`),
    check("products_sale_price_not_above_mrp", sql`${table.salePrice} <= ${table.mrp}`),
    check(
      "products_cost_price_nonnegative",
      sql`${table.costPrice} is null or ${table.costPrice} >= 0`,
    ),
    check(
      "products_gst_rate_range",
      sql`${table.gstRate} is null or (${table.gstRate} >= 0 and ${table.gstRate} <= 100)`,
    ),
    check("products_stock_nonnegative", sql`${table.stock} >= 0`),
    check("products_low_stock_threshold_nonnegative", sql`${table.lowStockThreshold} >= 0`),
    check("products_weight_positive", sql`${table.weight} is null or ${table.weight} > 0`),
    check(
      "products_shipping_fee_nonnegative",
      sql`${table.shippingFee} is null or ${table.shippingFee} >= 0`,
    ),
    check(
      "products_youtube_url_http",
      sql`${table.youtubeUrl} is null or ${table.youtubeUrl} ~ '^https?://'`,
    ),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    ...baseColumns(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    altText: text("alt_text"),
    position: integer("position").default(0).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(),
  },
  (table) => [
    index("product_images_product_id_idx").on(table.productId),
    uniqueIndex("product_images_product_position_unique").on(table.productId, table.position),
    uniqueIndex("product_images_one_primary_per_product_idx")
      .on(table.productId)
      .where(sql`${table.isPrimary} = true`),
    check("product_images_url_not_blank", sql`length(trim(${table.url})) > 0`),
    check("product_images_position_nonnegative", sql`${table.position} >= 0`),
  ],
);

export const productVariants = pgTable(
  "product_variants",
  {
    ...baseColumns(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    value: text("value").notNull(),
    sku: text("sku").notNull().unique(),
    additionalPrice: numeric("additional_price", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    stock: integer("stock").default(0).notNull(),
  },
  (table) => [
    index("product_variants_product_id_idx").on(table.productId),
    uniqueIndex("product_variants_product_name_value_unique").on(
      table.productId,
      table.name,
      table.value,
    ),
    check("product_variants_name_not_blank", sql`length(trim(${table.name})) > 0`),
    check("product_variants_value_not_blank", sql`length(trim(${table.value})) > 0`),
    check("product_variants_sku_not_blank", sql`length(trim(${table.sku})) > 0`),
    check("product_variants_additional_price_nonnegative", sql`${table.additionalPrice} >= 0`),
    check("product_variants_stock_nonnegative", sql`${table.stock} >= 0`),
  ],
);

export const carts = pgTable(
  "carts",
  {
    ...baseColumns(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id"),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("carts_user_id_unique")
      .on(table.userId)
      .where(sql`${table.userId} is not null`),
    uniqueIndex("carts_session_id_unique")
      .on(table.sessionId)
      .where(sql`${table.sessionId} is not null`),
    index("carts_expires_at_idx").on(table.expiresAt),
    check(
      "carts_exactly_one_owner",
      sql`(${table.userId} is not null) <> (${table.sessionId} is not null)`,
    ),
    check(
      "carts_session_id_not_blank",
      sql`${table.sessionId} is null or length(trim(${table.sessionId})) >= 16`,
    ),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    ...baseColumns(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    index("cart_items_cart_id_idx").on(table.cartId),
    index("cart_items_product_id_idx").on(table.productId),
    uniqueIndex("cart_items_product_without_variant_unique")
      .on(table.cartId, table.productId)
      .where(sql`${table.variantId} is null`),
    uniqueIndex("cart_items_product_variant_unique")
      .on(table.cartId, table.productId, table.variantId)
      .where(sql`${table.variantId} is not null`),
    check("cart_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    ...baseColumns(),
    orderNumber: text("order_number").notNull().unique(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    guestSessionHash: text("guest_session_hash"),
    status: orderStatusEnum("status").default("pending").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    paymentStatus: paymentStatusEnum("payment_status").default("pending").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    razorpayOrderId: text("razorpay_order_id"),
    razorpayPaymentId: text("razorpay_payment_id"),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 10, scale: 2 }).default("0").notNull(),
    shippingCharge: numeric("shipping_charge", { precision: 10, scale: 2 }).default("0").notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    notes: text("notes"),
    shippingAddressSnapshot: jsonb("shipping_address_snapshot")
      .$type<ShippingAddressSnapshot>()
      .notNull(),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    shippedAt: timestamp("shipped_at", { mode: "date", withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { mode: "date", withTimezone: true }),
    idempotencyKey: uuid("idempotency_key").defaultRandom().notNull().unique(),
  },
  (table) => [
    index("orders_user_id_idx").on(table.userId),
    index("orders_guest_session_hash_idx").on(table.guestSessionHash),
    index("orders_status_created_at_idx").on(table.status, table.createdAt),
    index("orders_payment_status_idx").on(table.paymentStatus),
    index("orders_customer_email_idx").on(table.customerEmail),
    index("orders_tracking_number_idx").on(table.trackingNumber),
    uniqueIndex("orders_razorpay_order_id_unique")
      .on(table.razorpayOrderId)
      .where(sql`${table.razorpayOrderId} is not null`),
    uniqueIndex("orders_razorpay_payment_id_unique")
      .on(table.razorpayPaymentId)
      .where(sql`${table.razorpayPaymentId} is not null`),
    check("orders_order_number_not_blank", sql`length(trim(${table.orderNumber})) > 0`),
    check(
      "orders_at_most_one_owner",
      sql`${table.userId} is null or ${table.guestSessionHash} is null`,
    ),
    check(
      "orders_guest_session_hash_format",
      sql`${table.guestSessionHash} is null or ${table.guestSessionHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check("orders_customer_email_not_blank", sql`length(trim(${table.customerEmail})) > 3`),
    check("orders_subtotal_nonnegative", sql`${table.subtotal} >= 0`),
    check("orders_discount_nonnegative", sql`${table.discount} >= 0`),
    check("orders_discount_not_above_subtotal", sql`${table.discount} <= ${table.subtotal}`),
    check("orders_shipping_charge_nonnegative", sql`${table.shippingCharge} >= 0`),
    check("orders_total_nonnegative", sql`${table.total} >= 0`),
    check(
      "orders_total_matches_components",
      sql`${table.total} = ${table.subtotal} - ${table.discount} + ${table.shippingCharge}`,
    ),
    check(
      "orders_payment_provider_fields",
      sql`${table.paymentMethod} = 'razorpay'
          or (${table.razorpayOrderId} is null and ${table.razorpayPaymentId} is null)`,
    ),
    check(
      "orders_tracking_fields_coherent",
      sql`${table.trackingNumber} is null or ${table.carrier} is not null`,
    ),
    check(
      "orders_delivery_after_shipping",
      sql`${table.deliveredAt} is null
          or (${table.shippedAt} is not null and ${table.deliveredAt} >= ${table.shippedAt})`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    ...baseColumns(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    variantLabel: text("variant_label"),
    sku: text("sku").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_product_id_idx").on(table.productId),
    check("order_items_product_name_not_blank", sql`length(trim(${table.productName})) > 0`),
    check("order_items_sku_not_blank", sql`length(trim(${table.sku})) > 0`),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
    check("order_items_unit_price_nonnegative", sql`${table.unitPrice} >= 0`),
    check("order_items_total_nonnegative", sql`${table.total} >= 0`),
    check(
      "order_items_total_matches_quantity",
      sql`${table.total} = ${table.unitPrice} * ${table.quantity}`,
    ),
  ],
);

export const coupons = pgTable(
  "coupons",
  {
    ...baseColumns(),
    code: text("code").notNull().unique(),
    type: couponTypeEnum("type").notNull(),
    value: numeric("value", { precision: 10, scale: 2 }).notNull(),
    minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }).default("0").notNull(),
    maxDiscount: numeric("max_discount", { precision: 10, scale: 2 }),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").default(0).notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => [
    index("coupons_active_expires_at_idx").on(table.isActive, table.expiresAt),
    check("coupons_code_not_blank", sql`length(trim(${table.code})) > 0`),
    check("coupons_code_uppercase", sql`${table.code} = upper(${table.code})`),
    check("coupons_value_positive", sql`${table.value} > 0`),
    check(
      "coupons_percentage_at_most_100",
      sql`${table.type} <> 'percentage' or ${table.value} <= 100`,
    ),
    check("coupons_min_order_amount_nonnegative", sql`${table.minOrderAmount} >= 0`),
    check(
      "coupons_max_discount_nonnegative",
      sql`${table.maxDiscount} is null or ${table.maxDiscount} >= 0`,
    ),
    check(
      "coupons_usage_limit_positive",
      sql`${table.usageLimit} is null or ${table.usageLimit} > 0`,
    ),
    check("coupons_used_count_nonnegative", sql`${table.usedCount} >= 0`),
    check(
      "coupons_used_count_within_limit",
      sql`${table.usageLimit} is null or ${table.usedCount} <= ${table.usageLimit}`,
    ),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    ...baseColumns(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body"),
    isApproved: boolean("is_approved").default(false).notNull(),
  },
  (table) => [
    index("reviews_product_approved_idx").on(table.productId, table.isApproved),
    index("reviews_user_id_idx").on(table.userId),
    uniqueIndex("reviews_user_product_unique").on(table.userId, table.productId),
    check("reviews_rating_range", sql`${table.rating} between 1 and 5`),
  ],
);

export const wishlists = pgTable(
  "wishlists",
  {
    ...baseColumns(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("wishlists_user_product_unique").on(table.userId, table.productId),
    index("wishlists_product_id_idx").on(table.productId),
  ],
);

export const settings = pgTable(
  "settings",
  {
    ...baseColumns(),
    key: text("key").notNull().unique(),
    value: jsonb("value").$type<JsonValue>().notNull(),
    label: text("label"),
    group: text("group").default("general").notNull(),
  },
  (table) => [
    index("settings_group_idx").on(table.group),
    check("settings_key_format", sql`${table.key} ~ '^[a-z][a-z0-9_.-]*$'`),
    check("settings_group_not_blank", sql`length(trim(${table.group})) > 0`),
  ],
);

export const homeBanners = pgTable(
  "home_banners",
  {
    ...baseColumns(),
    internalName: text("internal_name").notNull(),
    mediaType: homeBannerMediaTypeEnum("media_type").notNull(),
    desktopMediaUrl: text("desktop_media_url").notNull(),
    mobileMediaUrl: text("mobile_media_url"),
    posterUrl: text("poster_url"),
    altText: text("alt_text").notNull(),
    headline: text("headline"),
    subheading: text("subheading"),
    buttonLabel: text("button_label"),
    destinationUrl: text("destination_url"),
    openInNewTab: boolean("open_in_new_tab").default(false).notNull(),
    position: integer("position").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    startsAt: timestamp("starts_at", { mode: "date", withTimezone: true }),
    endsAt: timestamp("ends_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("home_banners_position_unique").on(table.position),
    index("home_banners_active_schedule_idx").on(table.isActive, table.startsAt, table.endsAt),
    check("home_banners_internal_name_not_blank", sql`length(trim(${table.internalName})) > 0`),
    check("home_banners_desktop_media_url_not_blank", sql`length(trim(${table.desktopMediaUrl})) > 0`),
    check("home_banners_alt_text_not_blank", sql`length(trim(${table.altText})) > 0`),
    check("home_banners_position_range", sql`${table.position} between 0 and 4`),
    check(
      "home_banners_image_has_mobile",
      sql`${table.mediaType} <> 'image' or ${table.mobileMediaUrl} is not null`,
    ),
    check(
      "home_banners_video_has_poster",
      sql`${table.mediaType} <> 'video' or ${table.posterUrl} is not null`,
    ),
    check(
      "home_banners_schedule_order",
      sql`${table.startsAt} is null or ${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
    check(
      "home_banners_destination_http_or_relative",
      sql`${table.destinationUrl} is null or ${table.destinationUrl} ~ '^(https?://|/)'`,
    ),
  ],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    ...baseColumns(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatusEnum("from_status"),
    toStatus: orderStatusEnum("to_status").notNull(),
    note: text("note"),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    index("order_status_history_order_created_idx").on(table.orderId, table.createdAt),
    index("order_status_history_actor_id_idx").on(table.actorId),
    check(
      "order_status_history_status_changed",
      sql`${table.fromStatus} is null or ${table.fromStatus} <> ${table.toStatus}`,
    ),
  ],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    ...baseColumns(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    providerEventId: text("provider_event_id").notNull().unique(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<JsonObject>().notNull(),
    processedAt: timestamp("processed_at", { mode: "date", withTimezone: true }),
    outcome: paymentEventOutcomeEnum("outcome").default("pending").notNull(),
    error: text("error"),
  },
  (table) => [
    index("payment_events_order_id_idx").on(table.orderId),
    index("payment_events_outcome_created_idx").on(table.outcome, table.createdAt),
    check(
      "payment_events_provider_event_id_not_blank",
      sql`length(trim(${table.providerEventId})) > 0`,
    ),
    check("payment_events_type_not_blank", sql`length(trim(${table.type})) > 0`),
  ],
);

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    ...baseColumns(),
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, { onDelete: "restrict" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status: couponRedemptionStatusEnum("status").default("reserved").notNull(),
    reservedAt: timestamp("reserved_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    redeemedAt: timestamp("redeemed_at", { mode: "date", withTimezone: true }),
    releasedAt: timestamp("released_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("coupon_redemptions_order_unique").on(table.orderId),
    index("coupon_redemptions_coupon_status_idx").on(table.couponId, table.status),
    index("coupon_redemptions_user_id_idx").on(table.userId),
    check(
      "coupon_redemptions_lifecycle_timestamps",
      sql`
        (${table.status} = 'reserved' and ${table.redeemedAt} is null and ${table.releasedAt} is null)
        or (${table.status} = 'applied' and ${table.redeemedAt} is not null and ${table.releasedAt} is null)
        or (${table.status} = 'released' and ${table.releasedAt} is not null)
      `,
    ),
  ],
);

export const refunds = pgTable(
  "refunds",
  {
    ...baseColumns(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    paymentEventId: uuid("payment_event_id").references(() => paymentEvents.id, {
      onDelete: "set null",
    }),
    providerPaymentId: text("provider_payment_id").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    status: refundStatusEnum("status").default("pending").notNull(),
    reason: text("reason"),
    providerRefundId: text("provider_refund_id"),
    idempotencyKey: uuid("idempotency_key").defaultRandom().notNull().unique(),
    processedAt: timestamp("processed_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    index("refunds_order_id_idx").on(table.orderId),
    index("refunds_status_created_idx").on(table.status, table.createdAt),
    uniqueIndex("refunds_provider_refund_id_unique")
      .on(table.providerRefundId)
      .where(sql`${table.providerRefundId} is not null`),
    check(
      "refunds_provider_payment_id_not_blank",
      sql`length(trim(${table.providerPaymentId})) > 0`,
    ),
    check("refunds_amount_positive", sql`${table.amount} > 0`),
  ],
);

export const newsletterSubscriptions = pgTable(
  "newsletter_subscriptions",
  {
    ...baseColumns(),
    email: text("email").notNull().unique(),
    fullName: text("full_name"),
    source: text("source").default("storefront").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    subscribedAt: timestamp("subscribed_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    unsubscribedAt: timestamp("unsubscribed_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    index("newsletter_subscriptions_active_idx").on(table.isActive),
    check("newsletter_subscriptions_email_not_blank", sql`length(trim(${table.email})) > 3`),
    check(
      "newsletter_subscriptions_lifecycle",
      sql`(${table.isActive} = true and ${table.unsubscribedAt} is null)
          or (${table.isActive} = false and ${table.unsubscribedAt} is not null)`,
    ),
  ],
);

export const emailOutbox = pgTable(
  "email_outbox",
  {
    ...baseColumns(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    toEmail: text("to_email").notNull(),
    template: text("template").notNull(),
    subject: text("subject").notNull(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    payload: jsonb("payload").$type<JsonObject>().default({}).notNull(),
    status: emailOutboxStatusEnum("status").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { mode: "date", withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp("sent_at", { mode: "date", withTimezone: true }),
    lastError: text("last_error"),
  },
  (table) => [
    index("email_outbox_pending_idx").on(table.status, table.nextAttemptAt),
    index("email_outbox_order_id_idx").on(table.orderId),
    index("email_outbox_user_id_idx").on(table.userId),
    check("email_outbox_to_email_not_blank", sql`length(trim(${table.toEmail})) > 3`),
    check("email_outbox_template_not_blank", sql`length(trim(${table.template})) > 0`),
    check("email_outbox_subject_not_blank", sql`length(trim(${table.subject})) > 0`),
    check("email_outbox_dedupe_key_not_blank", sql`length(trim(${table.dedupeKey})) > 0`),
    check("email_outbox_attempt_count_nonnegative", sql`${table.attemptCount} >= 0`),
    check(
      "email_outbox_sent_timestamp",
      sql`${table.status} <> 'sent' or ${table.sentAt} is not null`,
    ),
  ],
);

export const inventoryReservations = pgTable(
  "inventory_reservations",
  {
    ...baseColumns(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    status: inventoryReservationStatusEnum("status").default("reserved").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { mode: "date", withTimezone: true }),
    releasedAt: timestamp("released_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    index("inventory_reservations_order_id_idx").on(table.orderId),
    index("inventory_reservations_status_expires_idx").on(table.status, table.expiresAt),
    index("inventory_reservations_product_id_idx").on(table.productId),
    uniqueIndex("inventory_reservations_product_without_variant_unique")
      .on(table.orderId, table.productId)
      .where(sql`${table.variantId} is null`),
    uniqueIndex("inventory_reservations_product_variant_unique")
      .on(table.orderId, table.productId, table.variantId)
      .where(sql`${table.variantId} is not null`),
    check("inventory_reservations_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "inventory_reservations_lifecycle",
      sql`
        (${table.status} = 'reserved' and ${table.consumedAt} is null and ${table.releasedAt} is null)
        or (${table.status} = 'consumed' and ${table.consumedAt} is not null and ${table.releasedAt} is null)
        or (${table.status} = 'released' and ${table.releasedAt} is not null and ${table.consumedAt} is null)
      `,
    ),
  ],
);
