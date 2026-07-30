import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import type {
  addresses,
  brands,
  cartItems,
  carts,
  categories,
  couponRedemptions,
  coupons,
  emailOutbox,
  inventoryReservations,
  newsletterSubscriptions,
  orderItems,
  orders,
  orderStatusHistory,
  paymentEvents,
  productImages,
  products,
  productVariants,
  refunds,
  reviews,
  settings,
  users,
  wishlists,
} from "./schema/tables";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Address = InferSelectModel<typeof addresses>;
export type NewAddress = InferInsertModel<typeof addresses>;
export type Brand = InferSelectModel<typeof brands>;
export type NewBrand = InferInsertModel<typeof brands>;
export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;
export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;
export type ProductImage = InferSelectModel<typeof productImages>;
export type NewProductImage = InferInsertModel<typeof productImages>;
export type ProductVariant = InferSelectModel<typeof productVariants>;
export type NewProductVariant = InferInsertModel<typeof productVariants>;
export type Cart = InferSelectModel<typeof carts>;
export type NewCart = InferInsertModel<typeof carts>;
export type CartItem = InferSelectModel<typeof cartItems>;
export type NewCartItem = InferInsertModel<typeof cartItems>;
export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;
export type OrderItem = InferSelectModel<typeof orderItems>;
export type NewOrderItem = InferInsertModel<typeof orderItems>;
export type Coupon = InferSelectModel<typeof coupons>;
export type NewCoupon = InferInsertModel<typeof coupons>;
export type Review = InferSelectModel<typeof reviews>;
export type NewReview = InferInsertModel<typeof reviews>;
export type Wishlist = InferSelectModel<typeof wishlists>;
export type NewWishlist = InferInsertModel<typeof wishlists>;
export type Setting = InferSelectModel<typeof settings>;
export type NewSetting = InferInsertModel<typeof settings>;
export type OrderStatusHistoryEntry = InferSelectModel<typeof orderStatusHistory>;
export type NewOrderStatusHistoryEntry = InferInsertModel<typeof orderStatusHistory>;
export type PaymentEvent = InferSelectModel<typeof paymentEvents>;
export type NewPaymentEvent = InferInsertModel<typeof paymentEvents>;
export type CouponRedemption = InferSelectModel<typeof couponRedemptions>;
export type NewCouponRedemption = InferInsertModel<typeof couponRedemptions>;
export type Refund = InferSelectModel<typeof refunds>;
export type NewRefund = InferInsertModel<typeof refunds>;
export type NewsletterSubscription = InferSelectModel<typeof newsletterSubscriptions>;
export type NewNewsletterSubscription = InferInsertModel<typeof newsletterSubscriptions>;
export type EmailOutboxEntry = InferSelectModel<typeof emailOutbox>;
export type NewEmailOutboxEntry = InferInsertModel<typeof emailOutbox>;
export type InventoryReservation = InferSelectModel<typeof inventoryReservations>;
export type NewInventoryReservation = InferInsertModel<typeof inventoryReservations>;
