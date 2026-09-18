"server-only";

import {
  addresses,
  and,
  asc,
  cartItems as cartItemsTable,
  carts as cartsTable,
  couponRedemptions,
  coupons,
  desc,
  eq,
  getDatabase,
  gte,
  inArray,
  inventoryReservations,
  lte,
  orderItems as orderItemsTable,
  orders as ordersTable,
  orderStatusHistory,
  orderStatusValues,
  productImages,
  products as productsTable,
  productVariants,
  sql,
  type ShippingAddressSnapshot,
} from "@babascamera/db";

import { getOptionalUser } from "@/lib/auth/session";
import { getCartOwner, guestOwnerHash } from "@/lib/cart-session";
import { isUserCartOwner } from "@/features/cart/services/cart-service";
import { getCartForOwner } from "@/lib/data/storefront";
import { getDeliverySettingsForScope } from "@/lib/data/settings";
import { productImageUrl } from "@/lib/storage";
import type { Order } from "@/types/cart";

export class OrderDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 400, cause?: unknown) {
    super(message, { cause });
    this.name = "OrderDataError";
    this.status = status;
  }
}

export interface UserOrderFilters {
  status?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface BankTransferCheckoutPayload {
  totalOrderPrice?: number;
  shippingAddress: string;
  method?: "BANK_TRANSFER" | "RAZORPAY" | "bank_transfer" | "razorpay" | "bank";
  couponCode?: string;
  bankTransferDetails?: {
    referenceNumber: string;
    accountName: string;
    proofFile?: string | null;
  };
  products?: { product: string; quantity: number }[];
}



import { uploadProofToStorage } from "./proof-storage-service";
import { ProofValidationError } from "../schemas/proof-schema";

export async function uploadProofFile(file: File): Promise<{ _id: string; url: string }> {
  try {
    const uploaded = await uploadProofToStorage(file);
    return {
      _id: uploaded.url,
      url: uploaded.url,
    };
  } catch (error) {
    if (error instanceof ProofValidationError) {
      throw new OrderDataError(error.message, error.status, error);
    }
    throw error;
  }
}

function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

export async function createOrderFromCheckout(
  payload: BankTransferCheckoutPayload,
  isBuyNow = false,
): Promise<Order> {
  if (!payload.shippingAddress) {
    throw new OrderDataError("Shipping address is required.", 400);
  }

  try {
    const user = await getOptionalUser();
    const db = getDatabase();

    // 1. Resolve Shipping Address Snapshot — the address must belong to the
    // signed-in customer, and a real address is mandatory: orders with a
    // fabricated snapshot cannot actually be shipped.
    if (!user) {
      throw new OrderDataError("Please log in to complete your order.", 401);
    }
    const [addrRow] = await db
      .select()
      .from(addresses)
      .where(
        and(eq(addresses.id, payload.shippingAddress), eq(addresses.userId, user.id)),
      )
      .limit(1);

    if (!addrRow) {
      throw new OrderDataError(
        "Shipping address not found. Add a delivery address before placing the order.",
        400,
      );
    }

    const addressSnapshot: ShippingAddressSnapshot = {
      fullName: user.name || addrRow.label || "Customer",
      phone: user.phone ?? "",
      label: addrRow.label,
      ...(addrRow.building ? { building: addrRow.building } : {}),
      line1: addrRow.line1,
      line2: addrRow.line2 ?? undefined,
      city: addrRow.city,
      state: addrRow.state,
      pincode: addrRow.pincode,
      country: addrRow.country,
    };


    // 2. Resolve Order Items
    interface ResolvedItem {
      productId: string;
      variantId: string | null;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }

    const resolvedItems: ResolvedItem[] = [];

    if (isBuyNow && payload.products?.length) {
      for (const item of payload.products) {
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        const [prod] = await db
          .select()
          .from(productsTable)
          .where(
            and(eq(productsTable.id, item.product), eq(productsTable.isActive, true)),
          )
          .limit(1);

        if (!prod) {
          throw new OrderDataError("A product in your order is no longer available.", 400);
        }
        if (prod.stock < qty) {
          throw new OrderDataError(
            `Insufficient stock for "${prod.name}". Available: ${prod.stock}.`,
            400,
          );
        }
        const price = Number(prod.salePrice || prod.mrp || 0);
        resolvedItems.push({
          productId: prod.id,
          variantId: null,
          productName: prod.name,
          sku: prod.sku,
          quantity: qty,
          unitPrice: price,
          total: price * qty,
        });
      }
    } else {
      const owner = await getCartOwner();
      const cartRows = await getCartForOwner(owner);

      for (const row of cartRows) {
        const available = Math.min(
          row.stock ?? Number.POSITIVE_INFINITY,
          row.variantStock ?? Number.POSITIVE_INFINITY,
        );
        if (row.quantity > available) {
          throw new OrderDataError(
            `Insufficient stock for "${row.productName}". Available: ${available}.`,
            400,
          );
        }
        const price = Number(row.basePrice || 0) + Number(row.additionalPrice || 0);
        resolvedItems.push({
          productId: row.productId,
          variantId: row.variantId ?? null,
          productName: row.productName,
          sku: row.productSlug || `SKU-${row.productId.substring(0, 8)}`,
          quantity: row.quantity,
          unitPrice: price,
          total: price * row.quantity,
        });
      }
    }

    if (!resolvedItems.length) {
      throw new OrderDataError("No items found to place order.", 400);
    }

    // 3. Compute Totals — mirror the checkout display exactly: delivery
    // charge from the same settings the page renders, and the 2.42% gateway
    // fee added only on Razorpay orders so the payable amount shown is the
    // amount actually captured.
    const subtotal = resolvedItems.reduce((sum, item) => sum + item.total, 0);
    const delivery = await getDeliverySettingsForScope("Delivery");
    const {
      enableFreeDelivery,
      deliveryChargeFlat,
      freeDeliveryThreshold,
    } = delivery.data;
    const shippingCharge =
      !enableFreeDelivery || subtotal < freeDeliveryThreshold
        ? Math.max(0, deliveryChargeFlat)
        : 0;
    const methodUpper = String(payload.method || "").toUpperCase();

    // Coupon — validated against the same rules as the checkout preview API:
    // active, not expired, under its usage limit, and the items subtotal
    // meets the coupon's minimum order amount.
    let couponDiscount = 0;
    let appliedCouponId: string | null = null;
    const trimmedCouponCode = (payload.couponCode || "").trim().toUpperCase();
    if (trimmedCouponCode) {
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, trimmedCouponCode))
        .limit(1);
      if (
        !coupon?.isActive ||
        (coupon.expiresAt && coupon.expiresAt <= new Date()) ||
        (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) ||
        subtotal < Number(coupon.minOrderAmount)
      ) {
        throw new OrderDataError(
          "Coupon is invalid, expired, or does not apply to this cart.",
          400,
        );
      }
      const rawDiscount =
        coupon.type === "flat"
          ? Math.min(Number(coupon.value), subtotal)
          : (subtotal * Number(coupon.value)) / 100;
      const cappedDiscount = coupon.maxDiscount
        ? Math.min(rawDiscount, Number(coupon.maxDiscount))
        : rawDiscount;
      couponDiscount = Math.min(
        subtotal,
        Number(cappedDiscount.toFixed(2)),
      );
      appliedCouponId = coupon.id;
    }

    const baseTotal = subtotal - couponDiscount + shippingCharge;
    const platformFee =
      methodUpper === "RAZORPAY" ? Math.round(baseTotal * 242) / 10000 : 0;
    const grandTotal = Number((baseTotal + platformFee).toFixed(2));

    const orderNum = generateOrderNumber();
    const bankDetails = payload.bankTransferDetails;
    let notesText: string | null = null;
    if (bankDetails) {
      notesText = `Bank Transfer Ref: ${bankDetails.referenceNumber} | Account: ${bankDetails.accountName}`;
      if (bankDetails.proofFile) {
        notesText += ` | Proof: ${bankDetails.proofFile}`;
      }
    }

    // Bank transfer orders were historically stored as "cod" because this
    // mapping treated anything non-Razorpay as COD — display then showed
    // "Cash on Delivery" for bank transfers. The DB enum already carries
    // "bank_transfer"; store it for those orders. "cod" remains only for
    // legacy payloads that explicitly ask for it.
    const resolvedPaymentMethod: "razorpay" | "cod" | "bank_transfer" =
      methodUpper === "RAZORPAY"
        ? "razorpay"
        : methodUpper === "BANK_TRANSFER" || methodUpper === "BANK"
          ? "bank_transfer"
          : "cod";


    // 4. Create Order, Order Items, Inventory Reservations & Clear Cart inside DB Transaction
    const { createdOrder, insertedItems, ownerRef } = await db.transaction(async (tx) => {
      const owner = await getCartOwner();
      const ownerRef = isUserCartOwner(owner)
        ? owner.userId
        : guestOwnerHash(owner.sessionId);

      const [createdOrder] = await tx
        .insert(ordersTable)
        .values({
          orderNumber: orderNum,
          userId: user?.id ?? null,
          guestSessionHash: isUserCartOwner(owner) ? null : ownerRef,
          status: "pending",
          paymentMethod: resolvedPaymentMethod,
          paymentStatus: "pending",

          customerEmail: user?.email ?? "guest@babascamera.com",
          customerName: user?.name ?? addressSnapshot.fullName ?? "Guest Customer",
          customerPhone: user?.phone ?? addressSnapshot.phone ?? "",
          subtotal: subtotal.toFixed(2),
          discount: couponDiscount.toFixed(2),
          shippingCharge: shippingCharge.toFixed(2),
          platformCharges: platformFee.toFixed(2),
          total: grandTotal.toFixed(2),
          notes: notesText,
          shippingAddressSnapshot: addressSnapshot,
        })
        .returning();

      if (!createdOrder) {
        throw new OrderDataError("Failed to save order to database.", 500);
      }

      const insertedItems: (typeof orderItemsTable.$inferSelect)[] = [];
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const now = new Date();

      for (const item of resolvedItems) {
        // Decrement stock inside the guarded updates: a concurrent order can
        // only take stock that is actually available. Restores happen on
        // cancellation, payment failure and reservation expiry.
        const [decremented] = await tx
          .update(productsTable)
          .set({
            stock: sql`${productsTable.stock} - ${item.quantity}`,
            updatedAt: now,
          })
          .where(
            and(
              eq(productsTable.id, item.productId),
              gte(productsTable.stock, item.quantity),
            ),
          )
          .returning({ id: productsTable.id });
        if (!decremented) {
          throw new OrderDataError(
            `Insufficient stock for "${item.productName}".`,
            400,
          );
        }
        if (item.variantId) {
          const [variantDecremented] = await tx
            .update(productVariants)
            .set({
              stock: sql`${productVariants.stock} - ${item.quantity}`,
              updatedAt: now,
            })
            .where(
              and(
                eq(productVariants.id, item.variantId),
                gte(productVariants.stock, item.quantity),
              ),
            )
            .returning({ id: productVariants.id });
          if (!variantDecremented) {
            throw new OrderDataError(
              `Insufficient stock for "${item.productName}".`,
              400,
            );
          }
        }

        const [insertedItem] = await tx
          .insert(orderItemsTable)
          .values({
            orderId: createdOrder.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toFixed(2),
            total: item.total.toFixed(2),
          })
          .returning();

        if (insertedItem) {
          insertedItems.push(insertedItem);
        }

        await tx.insert(inventoryReservations).values({
          orderId: createdOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          status: "reserved",
          expiresAt,
        });
      }

      await tx.insert(orderStatusHistory).values({
        orderId: createdOrder.id,
        fromStatus: null,
        toStatus: "pending",
        note:
          resolvedPaymentMethod === "razorpay"
            ? "Awaiting Razorpay payment"
            : "Order created",
        actorId: user?.id ?? null,
      });

      if (appliedCouponId) {
        await tx
          .update(coupons)
          .set({
            usedCount: sql`${coupons.usedCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(coupons.id, appliedCouponId));
        await tx.insert(couponRedemptions).values({
          couponId: appliedCouponId,
          orderId: createdOrder.id,
          userId: user?.id ?? null,
          status: resolvedPaymentMethod === "razorpay" ? "reserved" : "applied",
          redeemedAt: resolvedPaymentMethod === "razorpay" ? null : new Date(),
        });
      }

      if (!isBuyNow) {
        const cartCondition = owner.userId
          ? eq(cartsTable.userId, owner.userId)
          : owner.sessionId
            ? eq(cartsTable.sessionId, owner.sessionId)
            : null;

        if (cartCondition) {
          const [cartRow] = await tx
            .select({ id: cartsTable.id })
            .from(cartsTable)
            .where(cartCondition)
            .limit(1);

          if (cartRow) {
            await tx.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cartRow.id));
          }
        }
      }

      return { createdOrder, insertedItems, ownerRef };
    });

    // 5. Initialize Razorpay Order if payment method is RAZORPAY
    let razorpayOrderId: string | null = null;
    let razorpayKeyId = "";

    if (resolvedPaymentMethod === "razorpay") {
      try {
        const amountPaise = Math.round(grandTotal * 100);
        const { createOrFindRazorpayOrder, publicRazorpayKeyId } = await import(
          "@/lib/payments/razorpay"
        );
        const providerOrder = await createOrFindRazorpayOrder({
          localOrderId: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          ownerRef,
          amountPaise,
          currency: "INR",
        });

        razorpayOrderId = providerOrder.id;
        razorpayKeyId = publicRazorpayKeyId();

        await db
          .update(ordersTable)
          .set({ razorpayOrderId, updatedAt: new Date() })
          .where(eq(ordersTable.id, createdOrder.id));
      } catch (err) {
        console.error("Razorpay order creation failed:", err);
        throw new OrderDataError(
          err instanceof Error ? err.message : "Razorpay order creation failed",
          500,
          err,
        );
      }
    }

    const imageMap = await fetchImageMapForItems(db, insertedItems);
    const mappedOrder = mapDbOrderToApiOrder(
      { ...createdOrder, razorpayOrderId },
      insertedItems,
      imageMap,
    );

    const transactionData =
      resolvedPaymentMethod === "razorpay" && razorpayOrderId
        ? {
          _id: `txn_${createdOrder.id}`,
          order: createdOrder.id,
          user: user?.id ?? "",
          paymentType: "ORDER",
          paymentMode: "PRE-PAID",
          paymentTiming: "IMMEDIATE",
          paymentGateway: "RAZORPAY",
          amount: grandTotal,
          dueAmount: grandTotal,
          capturedAmount: 0,
          refundAmount: 0,
          status: "PENDING",
          code: createdOrder.orderNumber,
          razorpayGatewayDetails: {
            orderId: razorpayOrderId,
            keyId: razorpayKeyId,
          },
          createdAt: createdOrder.createdAt.toISOString(),
          updatedAt: createdOrder.updatedAt.toISOString(),
        }
        : undefined;

    return {
      order: mappedOrder,
      transaction: transactionData,
    } as unknown as Order;
  } catch (error: unknown) {
    if (error instanceof OrderDataError) throw error;
    throw new OrderDataError(
      error instanceof Error ? error.message : "Failed to process order",
      400,
      error,
    );
  }
}

async function fetchImageMapForItems(
  db: ReturnType<typeof getDatabase>,
  items: (typeof orderItemsTable.$inferSelect)[],
): Promise<Map<string, string>> {
  const productIds = Array.from(
    new Set(items.map((i) => i.productId).filter((id): id is string => Boolean(id)))
  );

  const imageMap = new Map<string, string>();
  if (productIds.length > 0) {
    const imgRows = await db
      .select({
        productId: productImages.productId,
        url: productImages.url,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(desc(productImages.isPrimary), asc(productImages.position));

    for (const img of imgRows) {
      if (!imageMap.has(img.productId)) {
        imageMap.set(img.productId, img.url);
      }
    }
  }
  return imageMap;
}

function mapDbOrderToApiOrder(
  order: typeof ordersTable.$inferSelect,
  items: (typeof orderItemsTable.$inferSelect)[],
  imageMap?: Map<string, string>,
) {
  const snapshot = (order.shippingAddressSnapshot as ShippingAddressSnapshot) || {};
  return {
    _id: order.id,
    code: order.orderNumber,
    orderStatus: order.status.toUpperCase(),
    orderPaymentStatus: order.paymentStatus.toUpperCase(),
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),

    totalSalePrice: order.subtotal,
    discountAmount: Number(order.discount),
    deliveryCharges: order.shippingCharge,
    taxAmount: "0.00",
    platformCharges: "0.00",
    totalOrderPrice: order.total,
    totalCapturedAmount: order.paymentStatus === "paid" ? order.total : "0.00",
    deliveryDetails: order.trackingNumber
      ? {
          trackingId: order.trackingNumber,
          partnerName: order.carrier ?? undefined,
          url: order.trackingUrl ?? undefined,
        }
      : undefined,
    shippingAddress: {
      name: snapshot.fullName || "Customer",
      phone: snapshot.phone || "",
      building: snapshot.building || "",
      line1: snapshot.line1 || "",
      line2: snapshot.line2 || "",
      city: snapshot.city || "",
      state: snapshot.state || "",
      postalCode: snapshot.pincode || "",
      country: snapshot.country || "India",
    },
    products: items.map((item) => {
      const rawUrl = item.productId ? imageMap?.get(item.productId) : null;
      const imgKey = rawUrl ? productImageUrl(rawUrl) : "placeholder.svg";
      return {
        _id: item.id,
        quantity: item.quantity,
        actualPrice: item.unitPrice,
        salePrice: item.unitPrice,
        totalPrice: item.total,
        discount: "0.00",
        reduction: "0.00",
        orderProductStatus: order.status.toUpperCase(),
        product: {
          _id: item.productId ?? item.id,
          name: item.productName,
          slug: item.sku,
          code: item.sku,
          images: [
            {
              _id: "img_1",
              name: item.productName,
              key: imgKey,
              mimetype: "image/jpeg",
              size: 0,
              thumbnail: true,
            },
          ],
        },
      };
    }),
  };
}

export async function fetchUserOrders(filters: UserOrderFilters = {}) {
  try {
    const user = await getOptionalUser();
    if (!user) return [];

    const db = getDatabase();
    const conditions = [eq(ordersTable.userId, user.id)];

    if (filters.status && filters.status.trim()) {
      const normalizedStatus = filters.status.trim().toLowerCase();
      if (!orderStatusValues.includes(normalizedStatus as (typeof orderStatusValues)[number])) {
        return [];
      }
      conditions.push(eq(ordersTable.status, normalizedStatus as typeof ordersTable.$inferSelect.status));
    }

    if (filters.from) {
      const fromDate = new Date(filters.from);
      if (!Number.isNaN(fromDate.getTime())) {
        conditions.push(gte(ordersTable.createdAt, fromDate));
      }
    }

    if (filters.to) {
      const toDate = new Date(filters.to);
      if (!Number.isNaN(toDate.getTime())) {
        if (toDate.getHours() === 0 && toDate.getMinutes() === 0) {
          toDate.setHours(23, 59, 59, 999);
        }
        conditions.push(lte(ordersTable.createdAt, toDate));
      }
    }

    const orderRows = await db
      .select()
      .from(ordersTable)
      .where(and(...conditions))
      .orderBy(desc(ordersTable.createdAt));

    if (!orderRows.length) return [];

    const orderIds = orderRows.map((o) => o.id);
    const itemRows = await db
      .select()
      .from(orderItemsTable)
      .where(inArray(orderItemsTable.orderId, orderIds));

    let filteredOrderRows = orderRows;
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      filteredOrderRows = orderRows.filter((o) => {
        const orderItems = itemRows.filter((item) => item.orderId === o.id);
        const matchItem = orderItems.some(
          (item) => item.productName.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q)
        );
        const matchNum = o.orderNumber.toLowerCase().includes(q);
        return matchItem || matchNum;
      });
    }

    const itemsByOrder = new Map<string, (typeof orderItemsTable.$inferSelect)[]>();
    for (const item of itemRows) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    const imageMap = await fetchImageMapForItems(db, itemRows);

    return filteredOrderRows.map((o) =>
      mapDbOrderToApiOrder(o, itemsByOrder.get(o.id) ?? [], imageMap)
    );
  } catch (error: unknown) {
    throw new OrderDataError(
      error instanceof Error ? error.message : "Failed to fetch user orders",
      500,
      error,
    );
  }
}

export async function fetchOrderById(orderId: string) {
  if (!orderId) {
    throw new OrderDataError("Order ID is required", 400);
  }

  try {
    const db = getDatabase();
    const [orderRow] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!orderRow) {
      throw new OrderDataError("Order not found", 404);
    }

    const itemRows = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderRow.id));

    const imageMap = await fetchImageMapForItems(db, itemRows);

    return mapDbOrderToApiOrder(orderRow, itemRows, imageMap);
  } catch (error: unknown) {
    if (error instanceof OrderDataError) throw error;
    throw new OrderDataError(
      error instanceof Error ? error.message : "Failed to fetch order",
      400,
      error,
    );
  }
}

export async function cancelUserOrder(orderId: string, reason = "Cancelled by customer") {
  if (!orderId) {
    throw new OrderDataError("Order ID is required", 400);
  }

  try {
    const user = await getOptionalUser();
    if (!user) {
      throw new OrderDataError("Authentication required to cancel order", 401);
    }

    const db = getDatabase();
    const [orderRow] = await db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.id, orderId), eq(ordersTable.userId, user.id)))
      .limit(1);

    if (!orderRow) {
      throw new OrderDataError("Order not found or access denied.", 404);
    }

    const currentStatus = orderRow.status.toLowerCase();
    const NON_CANCELLABLE = ["shipped", "delivered", "cancelled", "refunded"];
    if (NON_CANCELLABLE.includes(currentStatus)) {
      throw new OrderDataError(
        `Order cannot be cancelled as it is already ${orderRow.status}.`,
        400,
      );
    }

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(ordersTable)
        .set({
          status: "cancelled",
          updatedAt: now,
        })
        .where(eq(ordersTable.id, orderId));

      await tx.insert(orderStatusHistory).values({
        orderId,
        fromStatus: orderRow.status,
        toStatus: "cancelled",
        note: reason,
        actorId: user.id,
      });

      // Release inventory reservations
      const releasable = await tx.query.inventoryReservations.findMany({
        where: (table, { and: andCond, eq: equals, inArray: inValues }) =>
          andCond(
            equals(table.orderId, orderId),
            inValues(table.status, ["reserved", "consumed"]),
          ),
      });

      for (const reservation of releasable) {
        await tx
          .update(productsTable)
          .set({
            stock: sql`${productsTable.stock} + ${reservation.quantity}`,
            updatedAt: now,
          })
          .where(eq(productsTable.id, reservation.productId));

        if (reservation.variantId) {
          await tx
            .update(productVariants)
            .set({
              stock: sql`${productVariants.stock} + ${reservation.quantity}`,
              updatedAt: now,
            })
            .where(eq(productVariants.id, reservation.variantId));
        }

        await tx
          .update(inventoryReservations)
          .set({
            status: "released",
            consumedAt: null,
            releasedAt: now,
            updatedAt: now,
          })
          .where(eq(inventoryReservations.id, reservation.id));
      }

      // Release coupon redemptions
      const redemptions = await tx.query.couponRedemptions.findMany({
        where: (table, { and: andCond, eq: equals, inArray: inValues }) =>
          andCond(
            equals(table.orderId, orderId),
            inValues(table.status, ["reserved", "applied"]),
          ),
      });

      for (const redemption of redemptions) {
        await tx
          .update(couponRedemptions)
          .set({ status: "released", releasedAt: now, updatedAt: now })
          .where(eq(couponRedemptions.id, redemption.id));

        await tx
          .update(coupons)
          .set({
            usedCount: sql`greatest(${coupons.usedCount} - 1, 0)`,
            updatedAt: now,
          })
          .where(eq(coupons.id, redemption.couponId));
      }
    });

    return fetchOrderById(orderId);
  } catch (error: unknown) {
    if (error instanceof OrderDataError) throw error;
    throw new OrderDataError(
      error instanceof Error ? error.message : "Failed to cancel order",
      400,
      error,
    );
  }
}

export async function payPendingOrder(orderId: string) {
  if (!orderId) {
    throw new OrderDataError("Order ID is required", 400);
  }

  try {
    const user = await getOptionalUser();
    const db = getDatabase();

    const [orderRow] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, orderId))
      .limit(1);

    if (!orderRow) {
      throw new OrderDataError("Order not found", 404);
    }

    // Ownership: a signed-in customer may only pay their own order; guest
    // orders require the matching guest session; anonymous callers are
    // always rejected.
    if (orderRow.userId) {
      if (!user || user.id !== orderRow.userId) {
        throw new OrderDataError("Unauthorized access to order", 403);
      }
    } else {
      const owner = await getCartOwner();
      if (
        isUserCartOwner(owner) ||
        guestOwnerHash(owner.sessionId) !== orderRow.guestSessionHash
      ) {
        throw new OrderDataError("Unauthorized access to order", 403);
      }
    }

    if (orderRow.status === "cancelled") {
      throw new OrderDataError("This order has been cancelled and cannot be paid.", 400);
    }

    if (orderRow.paymentStatus === "paid" || orderRow.status === "confirmed" || orderRow.status === "delivered") {
      throw new OrderDataError("This order has already been paid.", 400);
    }

    if (orderRow.status !== "pending") {
      throw new OrderDataError(`Order status is '${orderRow.status}' and cannot be paid.`, 400);
    }

    const itemRows = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, orderRow.id));

    if (!itemRows.length) {
      throw new OrderDataError("Order has no items.", 400);
    }

    for (const item of itemRows) {
      if (item.productId) {
        const [product] = await db
          .select({
            id: productsTable.id,
            name: productsTable.name,
            stock: productsTable.stock,
            isActive: productsTable.isActive,
          })
          .from(productsTable)
          .where(eq(productsTable.id, item.productId))
          .limit(1);

        if (!product) {
          throw new OrderDataError(`Product "${item.productName}" is no longer available.`, 400);
        }

        if (!product.isActive) {
          throw new OrderDataError(`Product "${product.name}" is currently unavailable.`, 400);
        }

        if (product.stock < item.quantity) {
          throw new OrderDataError(
            `Insufficient stock for "${product.name}". Available: ${product.stock}, required: ${item.quantity}.`,
            400
          );
        }
      }
    }

    const grandTotal = Number(orderRow.total);
    const amountPaise = Math.round(grandTotal * 100);
    const ownerRef = orderRow.userId ?? orderRow.guestSessionHash ?? orderRow.id;

    const { createOrFindRazorpayOrder, publicRazorpayKeyId } = await import(
      "@/lib/payments/razorpay"
    );

    const providerOrder = await createOrFindRazorpayOrder({
      localOrderId: orderRow.id,
      orderNumber: orderRow.orderNumber,
      ownerRef,
      amountPaise,
      currency: "INR",
    });

    const razorpayOrderId = providerOrder.id;
    const razorpayKeyId = publicRazorpayKeyId();

    if (orderRow.razorpayOrderId !== razorpayOrderId) {
      await db
        .update(ordersTable)
        .set({ razorpayOrderId, updatedAt: new Date() })
        .where(eq(ordersTable.id, orderRow.id));
    }

    return {
      success: true,
      orderId: orderRow.id,
      orderNumber: orderRow.orderNumber,
      razorpayOrderId,
      razorpayKeyId,
      amountPaise,
      currency: "INR",
    };
  } catch (error: unknown) {
    if (error instanceof OrderDataError) throw error;
    throw new OrderDataError(
      error instanceof Error ? error.message : "Failed to process payment for pending order",
      400,
      error,
    );
  }
}
