import "server-only";

import { createHash, randomUUID } from "node:crypto";
import {
  addresses,
  and,
  asc,
  cartItems,
  carts,
  couponRedemptions,
  coupons,
  desc,
  emailOutbox,
  eq,
  getDatabase,
  gt,
  inArray,
  inventoryReservations,
  isNull,
  lte,
  moneyToPaise,
  orderItems,
  orders,
  orderStatusHistory,
  paiseToMoney,
  paymentEvents,
  productVariants,
  products,
  refunds,
  sql,
  users,
  type ShippingAddressSnapshot,
  type JsonObject,
} from "@babascamera/db";
import {
  calculateCheckoutTotals,
  decimalToPaise,
  percentageToBasisPoints,
  paiseToDecimal,
  safePaiseNumber,
} from "./money";
import type { CheckoutInput } from "./checkout-schema";
import { getCheckoutSettings } from "@/lib/data/settings";
import {
  getCartForOwner,
  isUserCartOwner,
  type CartOwner,
} from "@/lib/data/storefront";
import { guestOwnerHash } from "@/lib/cart-session";
import {
  createOrFindRazorpayOrder,
  fetchRazorpayCapture,
  publicRazorpayKeyId,
  RazorpayOperationError,
} from "@/lib/payments/razorpay";
import {
  aggregatePurchasedCartLines,
  remainingCartQuantity,
} from "./cart-reconciliation";

const RAZORPAY_RESERVATION_MINUTES = 15;

export class CommerceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommerceError";
  }
}

export interface CheckoutResult {
  orderId: string;
  orderNumber: string;
  paymentMethod: "razorpay" | "cod";
  totalPaise: number;
  currency: "INR";
  completed: boolean;
  razorpay?: {
    keyId: string;
    orderId: string;
  };
}

function deterministicUuid(value: string): string {
  const bytes = Buffer.from(createHash("sha256").update(value).digest().subarray(0, 16));
  bytes.writeUInt8((bytes.readUInt8(6) & 0x0f) | 0x40, 6);
  bytes.writeUInt8((bytes.readUInt8(8) & 0x3f) | 0x80, 8);
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sameAddress(
  snapshot: ShippingAddressSnapshot,
  address: ShippingAddressSnapshot,
): boolean {
  return JSON.stringify(snapshot) === JSON.stringify(address);
}

async function releaseReservedOrder(orderId: string, reason: string) {
  const database = getDatabase();
  await database.transaction(async (transaction) => {
    const [order] = await transaction
      .select({
        id: orders.id,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update")
      .limit(1);
    if (
      !order ||
      order.status !== "pending" ||
      order.paymentStatus !== "pending"
    ) {
      return;
    }

    const released = await transaction
      .update(inventoryReservations)
      .set({
        status: "released",
        releasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.status, "reserved"),
        ),
      )
      .returning({
        productId: inventoryReservations.productId,
        variantId: inventoryReservations.variantId,
        quantity: inventoryReservations.quantity,
      });
    for (const reservation of released) {
      await transaction
        .update(products)
        .set({
          stock: sql`${products.stock} + ${reservation.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, reservation.productId));
      if (reservation.variantId) {
        await transaction
          .update(productVariants)
          .set({
            stock: sql`${productVariants.stock} + ${reservation.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, reservation.variantId));
      }
    }

    const releasedCoupons = await transaction
      .update(couponRedemptions)
      .set({
        status: "released",
        releasedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(couponRedemptions.orderId, orderId),
          eq(couponRedemptions.status, "reserved"),
        ),
      )
      .returning({ couponId: couponRedemptions.couponId });
    for (const redemption of releasedCoupons) {
      await transaction
        .update(coupons)
        .set({
          usedCount: sql`greatest(${coupons.usedCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(coupons.id, redemption.couponId));
    }

    await transaction
      .update(orders)
      .set({
        status: "cancelled",
        paymentStatus: "failed",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
    await transaction.insert(orderStatusHistory).values({
      orderId,
      fromStatus: "pending",
      toStatus: "cancelled",
      note: reason,
    });
  });
}

export async function cancelFailedRazorpayOrder(
  providerOrderId: string,
): Promise<string | null> {
  const [order] = await getDatabase()
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.razorpayOrderId, providerOrderId))
    .limit(1);
  if (!order) return null;
  await releaseReservedOrder(
    order.id,
    "Razorpay reported that payment failed",
  );
  return order.id;
}

async function createLocalCheckoutOrder(input: {
  owner: CartOwner;
  authenticatedEmail?: string | undefined;
  checkout: CheckoutInput;
}): Promise<{
  result: CheckoutResult;
  isNew: boolean;
}> {
  const checkoutSettings = await getCheckoutSettings();
  const database = getDatabase();
  return database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${input.checkout.idempotencyKey}, 0))`,
    );

    let addressSnapshot: ShippingAddressSnapshot;
    let customerEmail: string;
    if (isUserCartOwner(input.owner)) {
      const [profile] = await transaction
        .select({
          fullName: users.fullName,
          phone: users.phone,
          email: users.email,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.id, input.owner.userId))
        .limit(1);
      if (!profile?.isActive) {
        throw new CommerceError("Active customer profile not found.");
      }
      if (!profile.phone?.trim()) {
        throw new CommerceError("Add a phone number to your profile before checkout.");
      }
      if (!input.checkout.addressId) {
        throw new CommerceError("Select a delivery address.");
      }
      const [address] = await transaction
        .select()
        .from(addresses)
        .where(
          and(
            eq(addresses.id, input.checkout.addressId),
            eq(addresses.userId, input.owner.userId),
          ),
        )
        .limit(1);
      if (!address) throw new CommerceError("Delivery address not found.");
      customerEmail = input.authenticatedEmail ?? profile.email;
      addressSnapshot = {
        fullName: profile.fullName?.trim() || customerEmail,
        phone: profile.phone.trim(),
        label: address.label,
        line1: address.line1,
        ...(address.line2 ? { line2: address.line2 } : {}),
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country,
      };
    } else {
      const guest = input.checkout.guest;
      if (!guest) throw new CommerceError("Guest delivery details are required.");
      customerEmail = guest.email;
      addressSnapshot = {
        fullName: guest.fullName,
        phone: guest.phone,
        label: guest.label,
        line1: guest.line1,
        ...(guest.line2 ? { line2: guest.line2 } : {}),
        city: guest.city,
        state: guest.state,
        pincode: guest.pincode,
        country: guest.country,
      };
    }
    const ownerRef = isUserCartOwner(input.owner)
      ? input.owner.userId
      : guestOwnerHash(input.owner.sessionId);

    const [existing] = await transaction
      .select()
      .from(orders)
      .where(eq(orders.idempotencyKey, input.checkout.idempotencyKey))
      .for("update")
      .limit(1);
    if (existing) {
      if (
        (isUserCartOwner(input.owner)
          ? existing.userId !== input.owner.userId
          : existing.guestSessionHash !== ownerRef) ||
        existing.paymentMethod !== input.checkout.paymentMethod ||
        !sameAddress(existing.shippingAddressSnapshot, addressSnapshot)
      ) {
        throw new CommerceError(
          "This checkout key was already used for a different request.",
        );
      }
      if (
        existing.status === "cancelled" ||
        existing.paymentStatus === "failed"
      ) {
        throw new CommerceError(
          "This checkout expired or was cancelled. Start a new checkout.",
        );
      }
      return {
        isNew: false,
        result: {
          orderId: existing.id,
          orderNumber: existing.orderNumber,
          paymentMethod: existing.paymentMethod,
          totalPaise: moneyToPaise(existing.total),
          currency: "INR",
          completed:
            existing.paymentMethod === "cod" ||
            existing.paymentStatus === "paid",
          ...(existing.razorpayOrderId
            ? {
                razorpay: {
                  keyId: publicRazorpayKeyId(),
                  orderId: existing.razorpayOrderId,
                },
              }
            : {}),
        },
      };
    }

    const [cart] = await transaction
      .select({ id: carts.id })
      .from(carts)
      .where(
        isUserCartOwner(input.owner)
          ? eq(carts.userId, input.owner.userId)
          : eq(carts.sessionId, input.owner.sessionId),
      )
      .for("update")
      .limit(1);
    if (!cart) throw new CommerceError("Your cart is empty.");

    const initialItems = await transaction
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        variantId: cartItems.variantId,
        quantity: cartItems.quantity,
      })
      .from(cartItems)
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(asc(cartItems.productId), asc(cartItems.variantId));
    if (!initialItems.length) throw new CommerceError("Your cart is empty.");

    const productIds = [...new Set(initialItems.map((item) => item.productId))];
    const variantIds = initialItems
      .map((item) => item.variantId)
      .filter((value): value is string => Boolean(value));
    await transaction
      .select({ id: products.id })
      .from(products)
      .where(inArray(products.id, productIds))
      .orderBy(asc(products.id))
      .for("update");
    if (variantIds.length) {
      await transaction
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(inArray(productVariants.id, variantIds))
        .orderBy(asc(productVariants.id))
        .for("update");
    }

    const lines = await transaction
      .select({
        productId: products.id,
        productName: products.name,
        productSku: products.sku,
        productPrice: products.salePrice,
        productStock: products.stock,
        productActive: products.isActive,
        variantId: productVariants.id,
        variantProductId: productVariants.productId,
        variantName: productVariants.name,
        variantValue: productVariants.value,
        variantSku: productVariants.sku,
        additionalPrice: productVariants.additionalPrice,
        variantStock: productVariants.stock,
        quantity: cartItems.quantity,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
      .where(eq(cartItems.cartId, cart.id))
      .orderBy(asc(products.id), asc(productVariants.id));
    if (lines.length !== initialItems.length) {
      throw new CommerceError("One or more cart items are no longer available.");
    }

    const pricedLines = lines.map((line) => {
      if (!line.productActive) throw new CommerceError(`${line.productName} is unavailable.`);
      if (line.variantId && line.variantProductId !== line.productId) {
        throw new CommerceError("A cart option does not belong to its product.");
      }
      const available = line.variantId
        ? Math.min(line.productStock, line.variantStock ?? 0)
        : line.productStock;
      if (line.quantity > available) {
        throw new CommerceError(`Only ${available} unit(s) of ${line.productName} remain.`);
      }
      const unitPricePaise =
        decimalToPaise(line.productPrice) +
        decimalToPaise(line.additionalPrice ?? "0.00");
      return { ...line, unitPricePaise };
    });

    const subtotalPaise = pricedLines.reduce(
      (total, line) =>
        total + line.unitPricePaise * BigInt(line.quantity),
      0n,
    );
    let checkoutCoupon:
      | {
          id: string;
          type: "flat" | "percentage";
          value: string;
          maxDiscount: string | null;
        }
      | undefined;
    if (input.checkout.couponCode) {
      const [coupon] = await transaction
        .select()
        .from(coupons)
        .where(eq(coupons.code, input.checkout.couponCode))
        .for("update")
        .limit(1);
      if (
        !coupon?.isActive ||
        (coupon.expiresAt && coupon.expiresAt <= new Date()) ||
        (coupon.usageLimit !== null &&
          coupon.usedCount >= coupon.usageLimit) ||
        subtotalPaise < decimalToPaise(coupon.minOrderAmount)
      ) {
        throw new CommerceError("Coupon is invalid, expired, or unavailable.");
      }
      checkoutCoupon = {
        id: coupon.id,
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
      };
    }

    const totals = calculateCheckoutTotals({
      lines: pricedLines.map((line) => ({
        unitPricePaise: line.unitPricePaise,
        quantity: line.quantity,
      })),
      coupon:
        checkoutCoupon?.type === "flat"
          ? {
              type: "fixed",
              amountPaise: decimalToPaise(checkoutCoupon.value),
            }
          : checkoutCoupon
            ? {
                type: "percentage",
                basisPoints: percentageToBasisPoints(checkoutCoupon.value),
                maximumDiscountPaise: checkoutCoupon.maxDiscount
                  ? decimalToPaise(checkoutCoupon.maxDiscount)
                  : null,
              }
            : null,
      shippingFeePaise: BigInt(
        checkoutSettings.defaultShippingChargePaise,
      ),
      freeShippingThresholdPaise: BigInt(
        checkoutSettings.freeShippingThresholdPaise,
      ),
    });
    const totalPaise = safePaiseNumber(totals.totalPaise);
    if (totalPaise <= 0) throw new CommerceError("Checkout total must be positive.");
    if (input.checkout.paymentMethod === "cod") {
      if (!checkoutSettings.codEnabled) {
        throw new CommerceError("Cash on delivery is currently unavailable.");
      }
      if (totalPaise > checkoutSettings.codMaxOrderPaise) {
        throw new CommerceError("This order exceeds the cash-on-delivery limit.");
      }
      if (
        checkoutSettings.codPincodeMode === "allowlist" &&
        !checkoutSettings.codAllowedPincodes.includes(
          addressSnapshot.pincode,
        )
      ) {
        throw new CommerceError("Cash on delivery is not available for this PIN code.");
      }
    }

    const now = new Date();
    const orderId = randomUUID();
    const isCod = input.checkout.paymentMethod === "cod";
    const expiresAt = isCod
      ? now
      : new Date(
          now.getTime() + RAZORPAY_RESERVATION_MINUTES * 60 * 1000,
        );
    const [createdOrder] = await transaction
      .insert(orders)
      .values({
        id: orderId,
        orderNumber: sql<string>`public.next_order_number()`,
        userId: isUserCartOwner(input.owner) ? input.owner.userId : null,
        guestSessionHash: isUserCartOwner(input.owner) ? null : ownerRef,
        status: isCod ? "confirmed" : "pending",
        paymentMethod: input.checkout.paymentMethod,
        paymentStatus: "pending",
        customerEmail,
        customerName: addressSnapshot.fullName,
        customerPhone: addressSnapshot.phone,
        subtotal: paiseToMoney(safePaiseNumber(totals.subtotalPaise)),
        discount: paiseToMoney(safePaiseNumber(totals.discountPaise)),
        shippingCharge: paiseToMoney(
          safePaiseNumber(totals.shippingPaise),
        ),
        total: paiseToMoney(totalPaise),
        notes: input.checkout.notes || null,
        shippingAddressSnapshot: addressSnapshot,
        idempotencyKey: input.checkout.idempotencyKey,
      })
      .returning();
    if (!createdOrder) throw new CommerceError("Unable to create order.");

    for (const line of pricedLines) {
      await transaction
        .update(products)
        .set({
          stock: sql`${products.stock} - ${line.quantity}`,
          updatedAt: now,
        })
        .where(eq(products.id, line.productId));
      if (line.variantId) {
        await transaction
          .update(productVariants)
          .set({
            stock: sql`${productVariants.stock} - ${line.quantity}`,
            updatedAt: now,
          })
          .where(eq(productVariants.id, line.variantId));
      }
      await transaction.insert(orderItems).values({
        orderId,
        productId: line.productId,
        variantId: line.variantId,
        productName: line.productName,
        variantLabel: line.variantId
          ? `${line.variantName}: ${line.variantValue}`
          : null,
        sku: line.variantSku ?? line.productSku,
        quantity: line.quantity,
        unitPrice: paiseToMoney(safePaiseNumber(line.unitPricePaise)),
        total: paiseToMoney(
          safePaiseNumber(line.unitPricePaise * BigInt(line.quantity)),
        ),
      });
      await transaction.insert(inventoryReservations).values({
        orderId,
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        status: isCod ? "consumed" : "reserved",
        expiresAt,
        consumedAt: isCod ? now : null,
      });
    }

    if (checkoutCoupon) {
      await transaction
        .update(coupons)
        .set({
          usedCount: sql`${coupons.usedCount} + 1`,
          updatedAt: now,
        })
        .where(eq(coupons.id, checkoutCoupon.id));
      await transaction.insert(couponRedemptions).values({
        couponId: checkoutCoupon.id,
        orderId,
        userId: isUserCartOwner(input.owner) ? input.owner.userId : null,
        status: isCod ? "applied" : "reserved",
        redeemedAt: isCod ? now : null,
      });
    }

    await transaction.insert(orderStatusHistory).values({
      orderId,
      fromStatus: null,
      toStatus: isCod ? "confirmed" : "pending",
      note: isCod
        ? "Cash-on-delivery order confirmed"
        : "Awaiting Razorpay payment",
      actorId: isUserCartOwner(input.owner) ? input.owner.userId : null,
    });

    if (isCod) {
      await transaction.delete(cartItems).where(eq(cartItems.cartId, cart.id));
      if (checkoutSettings.orderEmailEnabled) {
        await transaction
          .insert(emailOutbox)
          .values({
            orderId,
            userId: isUserCartOwner(input.owner) ? input.owner.userId : null,
            toEmail: customerEmail,
            template: "order-confirmation",
            subject: `Order ${createdOrder.orderNumber} confirmed`,
            dedupeKey: `order-confirmation:${orderId}`,
            payload: {
              orderNumber: createdOrder.orderNumber,
              total: createdOrder.total,
              paymentMethod: "cod",
            },
          })
          .onConflictDoNothing({ target: emailOutbox.dedupeKey });
      }
    }

    return {
      isNew: true,
      result: {
        orderId,
        orderNumber: createdOrder.orderNumber,
        paymentMethod: input.checkout.paymentMethod,
        totalPaise,
        currency: "INR",
        completed: isCod,
      },
    };
  });
}

async function initializeRazorpayOrder(
  owner: CartOwner,
  local: CheckoutResult,
): Promise<CheckoutResult> {
  const database = getDatabase();
  return database.transaction(async (transaction) => {
    const [order] = await transaction
      .select()
      .from(orders)
      .where(eq(orders.id, local.orderId))
      .for("update")
      .limit(1);
    if (!order) throw new CommerceError("Order not found.");
    const ownerRef = isUserCartOwner(owner)
      ? owner.userId
      : guestOwnerHash(owner.sessionId);
    if (
      (isUserCartOwner(owner)
        ? order.userId !== owner.userId
        : order.guestSessionHash !== ownerRef)
    ) {
      throw new CommerceError("Order not found.");
    }
    if (order.paymentStatus === "paid") {
      return { ...local, completed: true };
    }
    if (
      order.status !== "pending" ||
      order.paymentStatus !== "pending" ||
      order.paymentMethod !== "razorpay"
    ) {
      throw new CommerceError("This order can no longer accept payment.");
    }
    const [reservation] = await transaction
      .select({ id: inventoryReservations.id })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.orderId, order.id),
          eq(inventoryReservations.status, "reserved"),
          gt(inventoryReservations.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!reservation) throw new CommerceError("Payment reservation has expired.");
    if (order.razorpayOrderId) {
      return {
        ...local,
        razorpay: {
          keyId: publicRazorpayKeyId(),
          orderId: order.razorpayOrderId,
        },
      };
    }

    const providerOrder = await createOrFindRazorpayOrder({
      localOrderId: order.id,
      orderNumber: order.orderNumber,
      ownerRef,
      amountPaise: moneyToPaise(order.total),
      currency: "INR",
    });
    await transaction
      .update(orders)
      .set({ razorpayOrderId: providerOrder.id, updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    return {
      ...local,
      razorpay: {
        keyId: publicRazorpayKeyId(),
        orderId: providerOrder.id,
      },
    };
  });
}

export async function placeCheckoutOrder(input: {
  owner: CartOwner;
  authenticatedEmail?: string | undefined;
  checkout: CheckoutInput;
}): Promise<CheckoutResult> {
  await expirePendingCheckoutOrders(20);
  const local = await createLocalCheckoutOrder(input);
  if (local.result.paymentMethod === "cod" || local.result.completed) {
    return local.result;
  }
  try {
    return await initializeRazorpayOrder(input.owner, local.result);
  } catch (error) {
    if (
      error instanceof RazorpayOperationError &&
      error.definitive &&
      local.isNew
    ) {
      await releaseReservedOrder(
        local.result.orderId,
        "Razorpay rejected payment initialization",
      );
    }
    throw error;
  }
}

export async function previewCartCoupon(
  owner: CartOwner,
  couponCode?: string,
) {
  const [items, checkoutSettings] = await Promise.all([
    getCartForOwner(owner),
    getCheckoutSettings(),
  ]);
  if (!items.length) throw new CommerceError("Your cart is empty.");
  const lines = items.map((item) => ({
    unitPricePaise:
      decimalToPaise(item.basePrice) +
      decimalToPaise(item.additionalPrice ?? "0.00"),
    quantity: item.quantity,
  }));
  const baseSubtotal = lines.reduce(
    (total, line) =>
      total + line.unitPricePaise * BigInt(line.quantity),
    0n,
  );
  let coupon:
    | {
        type: "fixed";
        amountPaise: bigint;
      }
    | {
        type: "percentage";
        basisPoints: bigint;
        maximumDiscountPaise?: bigint | null;
      }
    | null = null;
  let normalizedCode: string | null = null;
  if (couponCode?.trim()) {
    normalizedCode = couponCode.trim().toUpperCase();
    const [row] = await getDatabase()
      .select()
      .from(coupons)
      .where(
        and(
          eq(coupons.code, normalizedCode),
          eq(coupons.isActive, true),
          sql<boolean>`(${coupons.expiresAt} is null or ${coupons.expiresAt} > now())`,
          sql<boolean>`(${coupons.usageLimit} is null or ${coupons.usedCount} < ${coupons.usageLimit})`,
        ),
      )
      .limit(1);
    if (
      !row ||
      baseSubtotal < decimalToPaise(row.minOrderAmount)
    ) {
      throw new CommerceError(
        "Coupon is invalid, expired, or unavailable for this cart.",
      );
    }
    coupon =
      row.type === "flat"
        ? { type: "fixed", amountPaise: decimalToPaise(row.value) }
        : {
            type: "percentage",
            basisPoints: percentageToBasisPoints(row.value),
            ...(row.maxDiscount
              ? {
                  maximumDiscountPaise: decimalToPaise(
                    row.maxDiscount,
                  ),
                }
              : {}),
          };
  }
  const totals = calculateCheckoutTotals({
    lines,
    coupon,
    shippingFeePaise: BigInt(
      checkoutSettings.defaultShippingChargePaise,
    ),
    freeShippingThresholdPaise: BigInt(
      checkoutSettings.freeShippingThresholdPaise,
    ),
  });
  return {
    code: normalizedCode,
    subtotal: paiseToDecimal(totals.subtotalPaise),
    discount: paiseToDecimal(totals.discountPaise),
    shipping: paiseToDecimal(totals.shippingPaise),
    total: paiseToDecimal(totals.totalPaise),
  };
}

export async function reconcileCapturedPayment(input: {
  providerOrderId: string;
  providerPaymentId: string;
  owner?: CartOwner;
}) {
  const database = getDatabase();
  const [snapshot] = await database
    .select({
      id: orders.id,
      userId: orders.userId,
      guestSessionHash: orders.guestSessionHash,
      orderNumber: orders.orderNumber,
      total: orders.total,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      razorpayPaymentId: orders.razorpayPaymentId,
    })
    .from(orders)
    .where(eq(orders.razorpayOrderId, input.providerOrderId))
    .limit(1);
  if (!snapshot) throw new Error("Local Razorpay order not found.");
  const ownerRef = snapshot.userId ?? snapshot.guestSessionHash;
  if (!ownerRef) throw new Error("Local payment owner is missing.");

  await fetchRazorpayCapture({
    providerOrderId: input.providerOrderId,
    providerPaymentId: input.providerPaymentId,
    localOrderId: snapshot.id,
    orderNumber: snapshot.orderNumber,
    ownerRef,
    amountPaise: moneyToPaise(snapshot.total),
    currency: "INR",
  });

  return database.transaction(async (transaction) => {
    const [order] = await transaction
      .select()
      .from(orders)
      .where(eq(orders.id, snapshot.id))
      .for("update")
      .limit(1);
    if (!order) throw new Error("Order not found.");

    if (input.owner) {
      const requestOwnerRef = isUserCartOwner(input.owner)
        ? input.owner.userId
        : guestOwnerHash(input.owner.sessionId);
      const storedOwnerRef = order.userId ?? order.guestSessionHash;
      if (requestOwnerRef !== storedOwnerRef) {
        throw new Error("Order not found.");
      }
    }

    const consumePurchasedCartItems = async () => {
      const cartCondition = order.userId
        ? eq(carts.userId, order.userId)
        : input.owner && !isUserCartOwner(input.owner)
          ? eq(carts.sessionId, input.owner.sessionId)
          : null;
      if (!cartCondition) return;
      const [cart] = await transaction
        .select({ id: carts.id })
        .from(carts)
        .where(cartCondition)
        .limit(1);
      if (!cart) return;
      const [claim] = await transaction
        .insert(paymentEvents)
        .values({
          providerEventId: `internal:cart-reconciled:${order.id}`,
          type: "internal.cart_reconciled",
          orderId: order.id,
          payload: {},
          outcome: "processed",
          processedAt: new Date(),
        })
        .onConflictDoNothing({ target: paymentEvents.providerEventId })
        .returning({ id: paymentEvents.id });
      if (!claim) return;
      const purchasedItems = await transaction
        .select({
          productId: orderItems.productId,
          variantId: orderItems.variantId,
          quantity: orderItems.quantity,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      for (const purchasedItem of aggregatePurchasedCartLines(purchasedItems)) {
        const variantCondition = purchasedItem.variantId
          ? eq(cartItems.variantId, purchasedItem.variantId)
          : isNull(cartItems.variantId);
        const [currentItem] = await transaction
          .select({
            id: cartItems.id,
            quantity: cartItems.quantity,
          })
          .from(cartItems)
          .where(
            and(
              eq(cartItems.cartId, cart.id),
              eq(cartItems.productId, purchasedItem.productId),
              variantCondition,
            ),
          )
          .for("update")
          .limit(1);
        if (!currentItem) continue;
        const remaining = remainingCartQuantity(
          currentItem.quantity,
          purchasedItem.quantity,
        );
        if (remaining === null) {
          await transaction
            .delete(cartItems)
            .where(eq(cartItems.id, currentItem.id));
        } else {
          await transaction
            .update(cartItems)
            .set({ quantity: remaining, updatedAt: new Date() })
            .where(eq(cartItems.id, currentItem.id));
        }
      }
    };

    if (
      order.paymentStatus === "paid" &&
      order.razorpayPaymentId === input.providerPaymentId
    ) {
      await consumePurchasedCartItems();
      return { order, compensated: false };
    }

    const reservations = await transaction
      .select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, order.id))
      .for("update");
    const payable =
      order.status === "pending" &&
      order.paymentStatus === "pending" &&
      reservations.length > 0 &&
      reservations.every(
        (reservation) =>
          reservation.status === "reserved" &&
          reservation.expiresAt > new Date(),
      );
    if (!payable) {
      const refundKey = deterministicUuid(
        `late-capture:${input.providerPaymentId}`,
      );
      await transaction
        .insert(refunds)
        .values({
          orderId: order.id,
          providerPaymentId: input.providerPaymentId,
          amount: order.total,
          status: "pending",
          reason:
            "Captured after local reservation was released or order cancelled",
          idempotencyKey: refundKey,
        })
        .onConflictDoNothing({ target: refunds.idempotencyKey });
      await transaction
        .update(orders)
        .set({
          razorpayPaymentId: input.providerPaymentId,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
      return { order, compensated: true };
    }

    const now = new Date();
    await consumePurchasedCartItems();
    await transaction
      .update(inventoryReservations)
      .set({ status: "consumed", consumedAt: now, updatedAt: now })
      .where(
        and(
          eq(inventoryReservations.orderId, order.id),
          eq(inventoryReservations.status, "reserved"),
        ),
      );
    await transaction
      .update(couponRedemptions)
      .set({ status: "applied", redeemedAt: now, updatedAt: now })
      .where(
        and(
          eq(couponRedemptions.orderId, order.id),
          eq(couponRedemptions.status, "reserved"),
        ),
      );
    const [updated] = await transaction
      .update(orders)
      .set({
        status: "confirmed",
        paymentStatus: "paid",
        razorpayPaymentId: input.providerPaymentId,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id))
      .returning();
    await transaction.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: "pending",
      toStatus: "confirmed",
      note: "Razorpay payment captured and verified",
    });
    const checkoutSettings = await getCheckoutSettings();
    if (checkoutSettings.orderEmailEnabled) {
      await transaction
        .insert(emailOutbox)
        .values({
          orderId: order.id,
          userId: order.userId,
          toEmail: order.customerEmail,
          template: "order-confirmation",
          subject: `Order ${order.orderNumber} confirmed`,
          dedupeKey: `order-confirmation:${order.id}`,
          payload: {
            orderNumber: order.orderNumber,
            total: order.total,
            paymentMethod: "razorpay",
          },
        })
        .onConflictDoNothing({ target: emailOutbox.dedupeKey });
    }
    return { order: updated ?? order, compensated: false };
  });
}

export async function recordPaymentEvent(input: {
  providerEventId: string;
  type: string;
  orderId?: string | null;
  payload: JsonObject;
  outcome: "pending" | "processed" | "ignored" | "failed";
  error?: string | null;
}) {
  return getDatabase()
    .insert(paymentEvents)
    .values({
      providerEventId: input.providerEventId,
      type: input.type,
      orderId: input.orderId ?? null,
      payload: input.payload,
      outcome: input.outcome,
      processedAt: input.outcome === "pending" ? null : new Date(),
      error: input.error ?? null,
    })
    .onConflictDoNothing({ target: paymentEvents.providerEventId })
    .returning({ id: paymentEvents.id });
}

export async function expirePendingCheckoutOrders(limit = 50) {
  const database = getDatabase();
  const expired = await database
    .select({ orderId: inventoryReservations.orderId })
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.status, "reserved"),
        lte(inventoryReservations.expiresAt, new Date()),
      ),
    )
    .groupBy(inventoryReservations.orderId)
    .limit(Math.min(Math.max(limit, 1), 100));
  for (const row of expired) {
    await releaseReservedOrder(row.orderId, "Payment reservation expired");
  }
  return expired.length;
}

export async function listOrdersForUser(userId: string) {
  return getDatabase()
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export async function getOrderForUser(
  userId: string,
  orderNumberValue: string,
) {
  const database = getDatabase();
  const [order] = await database
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        eq(orders.orderNumber, orderNumberValue),
      ),
    )
    .limit(1);
  if (!order) return null;
  const items = await database
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.createdAt));
  const history = await database
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, order.id))
    .orderBy(asc(orderStatusHistory.createdAt));
  return { order, items, history };
}

export async function getOrderForOwner(
  owner: CartOwner,
  orderNumberValue: string,
) {
  const ownerCondition = isUserCartOwner(owner)
    ? eq(orders.userId, owner.userId)
    : eq(orders.guestSessionHash, guestOwnerHash(owner.sessionId));
  const database = getDatabase();
  const [order] = await database
    .select()
    .from(orders)
    .where(
      and(
        ownerCondition,
        eq(orders.orderNumber, orderNumberValue),
      ),
    )
    .limit(1);
  if (!order) return null;
  const items = await database
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.createdAt));
  return { order, items };
}
