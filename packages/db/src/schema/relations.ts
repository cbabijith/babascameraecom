import { relations } from "drizzle-orm";

import {
  addresses,
  brands,
  cartItems,
  carts,
  categories,
  couponRedemptions,
  coupons,
  emailOutbox,
  inventoryReservations,
  orderItems,
  orders,
  orderStatusHistory,
  paymentEvents,
  productImages,
  products,
  productVariants,
  refunds,
  reviews,
  users,
  wishlists,
} from "./tables";

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  carts: many(carts),
  couponRedemptions: many(couponRedemptions),
  emailOutbox: many(emailOutbox),
  orders: many(orders),
  reviews: many(reviews),
  statusChanges: many(orderStatusHistory),
  wishlists: many(wishlists),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  children: many(categories, {
    relationName: "categoryHierarchy",
  }),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryHierarchy",
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ many, one }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  cartItems: many(cartItems),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
  orderItems: many(orderItems),
  inventoryReservations: many(inventoryReservations),
  reviews: many(reviews),
  variants: many(productVariants),
  wishlists: many(wishlists),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productVariantsRelations = relations(productVariants, ({ many, one }) => ({
  cartItems: many(cartItems),
  inventoryReservations: many(inventoryReservations),
  orderItems: many(orderItems),
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const cartsRelations = relations(carts, ({ many, one }) => ({
  items: many(cartItems),
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  couponRedemptions: many(couponRedemptions),
  emailOutbox: many(emailOutbox),
  inventoryReservations: many(inventoryReservations),
  items: many(orderItems),
  paymentEvents: many(paymentEvents),
  refunds: many(refunds),
  statusHistory: many(orderStatusHistory),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  redemptions: many(couponRedemptions),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  product: one(products, {
    fields: [wishlists.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id],
  }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  actor: one(users, {
    fields: [orderStatusHistory.actorId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
}));

export const paymentEventsRelations = relations(paymentEvents, ({ many, one }) => ({
  order: one(orders, {
    fields: [paymentEvents.orderId],
    references: [orders.id],
  }),
  refunds: many(refunds),
}));

export const couponRedemptionsRelations = relations(couponRedemptions, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponRedemptions.couponId],
    references: [coupons.id],
  }),
  order: one(orders, {
    fields: [couponRedemptions.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [couponRedemptions.userId],
    references: [users.id],
  }),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  order: one(orders, {
    fields: [refunds.orderId],
    references: [orders.id],
  }),
  paymentEvent: one(paymentEvents, {
    fields: [refunds.paymentEventId],
    references: [paymentEvents.id],
  }),
}));

export const emailOutboxRelations = relations(emailOutbox, ({ one }) => ({
  order: one(orders, {
    fields: [emailOutbox.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [emailOutbox.userId],
    references: [users.id],
  }),
}));

export const inventoryReservationsRelations = relations(inventoryReservations, ({ one }) => ({
  order: one(orders, {
    fields: [inventoryReservations.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [inventoryReservations.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [inventoryReservations.variantId],
    references: [productVariants.id],
  }),
}));
