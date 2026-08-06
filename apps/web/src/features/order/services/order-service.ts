"server-only";

import {
  addresses,
  and,
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
  products as productsTable,
  productVariants,
  sql,
  type ShippingAddressSnapshot,
} from "@babascamera/db";

import { getOptionalUser } from "@/lib/auth/session";
import { getCartOwner } from "@/lib/cart-session";
import { getCartForOwner } from "@/lib/data/storefront";
import type { Order } from "@/types/cart";

export class OrderDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 400, cause?: unknown) {
    super(message, { cause });
    this.name = "OrderDataError";
    this.status = status;
  }
}

export type UserOrderFilters = {
  status?: string;
  from?: string;
  to?: string;
  search?: string;
};

export type BankTransferCheckoutPayload = {
  totalOrderPrice?: number;
  shippingAddress: string;
  method?: "BANK_TRANSFER" | "RAZORPAY" | "bank_transfer" | "razorpay" | "bank";
  bankTransferDetails?: {
    referenceNumber: string;
    accountName: string;
    proofFile?: string | null;
  };
  products?: Array<{ product: string; quantity: number }>;
};



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

    // 1. Resolve Shipping Address Snapshot
    let addressSnapshot: ShippingAddressSnapshot = {
      fullName: user?.user_metadata?.full_name ?? "Guest Customer",
      phone: user?.phone ?? "9876543210",
      label: "Shipping Address",
      line1: "Main Address",
      line2: "",
      city: "City",
      state: "State",
      pincode: "000000",
      country: "India",
    };

    try {
      const [addrRow] = await db
        .select()
        .from(addresses)
        .where(eq(addresses.id, payload.shippingAddress))
        .limit(1);

      if (addrRow) {
        addressSnapshot = {
          fullName: user?.user_metadata?.full_name ?? addrRow.label ?? "Customer",
          phone: user?.phone ?? "9876543210",
          label: addrRow.label,
          line1: addrRow.line1,
          line2: addrRow.line2 ?? undefined,
          city: addrRow.city,
          state: addrRow.state,
          pincode: addrRow.pincode,
          country: addrRow.country,
        };
      }
    } catch {
      // Keep default snapshot if lookup fails
    }


    // 2. Resolve Order Items
    type ResolvedItem = {
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      total: number;
    };

    const resolvedItems: ResolvedItem[] = [];

    if (isBuyNow && payload.products?.length) {
      for (const item of payload.products) {
        const [prod] = await db
          .select()
          .from(productsTable)
          .where(eq(productsTable.id, item.product))
          .limit(1);

        if (prod) {
          const price = Number(prod.salePrice || prod.mrp || 0);
          const qty = Math.max(1, item.quantity);
          resolvedItems.push({
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            quantity: qty,
            unitPrice: price,
            total: price * qty,
          });
        }
      }
    } else {
      const owner = await getCartOwner();
      const cartRows = await getCartForOwner(owner);

      for (const row of cartRows) {
        const price = Number(row.basePrice || 0) + Number(row.additionalPrice || 0);
        resolvedItems.push({
          productId: row.productId,
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

    // 3. Compute Totals
    const subtotal = resolvedItems.reduce((sum, item) => sum + item.total, 0);
    const shippingCharge = subtotal >= 3000 ? 0 : 100;
    const grandTotal = subtotal + shippingCharge;

    const orderNum = generateOrderNumber();
    const bankDetails = payload.bankTransferDetails;
    let notesText: string | null = null;
    if (bankDetails) {
      notesText = `Bank Transfer Ref: ${bankDetails.referenceNumber} | Account: ${bankDetails.accountName}`;
      if (bankDetails.proofFile) {
        notesText += ` | Proof: ${bankDetails.proofFile}`;
      }
    }

    const methodUpper = String(payload.method || "").toUpperCase();
    let resolvedPaymentMethod: "razorpay" | "cod" = "cod";
    if (methodUpper === "RAZORPAY") {
      resolvedPaymentMethod = "razorpay";
    }


    // 4. Create Order, Order Items, and Clear Cart inside an Atomic Database Transaction
    return await db.transaction(async (tx) => {
      const [createdOrder] = await tx
        .insert(ordersTable)
        .values({
          orderNumber: orderNum,
          userId: user?.id ?? null,
          status: "pending",
          paymentMethod: resolvedPaymentMethod,
          paymentStatus: "pending",

          customerEmail: user?.email ?? "guest@babascamera.com",
          customerName: user?.user_metadata?.full_name ?? "Guest Customer",
          customerPhone: user?.phone ?? "",
          subtotal: subtotal.toFixed(2),
          discount: "0.00",
          shippingCharge: shippingCharge.toFixed(2),
          total: grandTotal.toFixed(2),
          notes: notesText,
          shippingAddressSnapshot: addressSnapshot,
        })
        .returning();

      if (!createdOrder) {
        throw new OrderDataError("Failed to save order to database.", 500);
      }

      for (const item of resolvedItems) {
        await tx.insert(orderItemsTable).values({
          orderId: createdOrder.id,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          total: item.total.toFixed(2),
        });
      }

      if (!isBuyNow) {
        const owner = await getCartOwner();
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

      return {
        _id: createdOrder.id,
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        totalOrderPrice: Number(createdOrder.total),
        shippingAddress: payload.shippingAddress,
        status: "PENDING",
        createdAt: createdOrder.createdAt.toISOString(),
        updatedAt: createdOrder.updatedAt.toISOString(),
      } as unknown as Order;
    });
  } catch (error: unknown) {
    if (error instanceof OrderDataError) throw error;
    throw new OrderDataError(
      error instanceof Error ? error.message : "Failed to process order",
      400,
      error,
    );
  }
}

function mapDbOrderToApiOrder(
  order: typeof ordersTable.$inferSelect,
  items: (typeof orderItemsTable.$inferSelect)[],
) {
  const snapshot = order.shippingAddressSnapshot;
  return {
    _id: order.id,
    code: order.orderNumber,
    orderStatus: order.status.toUpperCase(),
    orderPaymentStatus: order.paymentStatus.toUpperCase(),
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt.toISOString(),

    totalSalePrice: order.subtotal,
    deliveryCharges: order.shippingCharge,
    taxAmount: "0.00",
    platformCharges: "0.00",
    totalOrderPrice: order.total,
    totalCapturedAmount: order.paymentStatus === "paid" ? order.total : "0.00",
    shippingAddress: {
      name: snapshot.fullName || "Customer",
      phone: snapshot.phone || "",
      line1: snapshot.line1 || "",
      line2: snapshot.line2 || "",
      city: snapshot.city || "",
      state: snapshot.state || "",
      postalCode: snapshot.pincode || "",
      country: snapshot.country || "India",
    },
    products: items.map((item) => ({
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
            key: "placeholder.svg",
            mimetype: "image/svg",
            size: 0,
            thumbnail: true,
          },
        ],
      },
    })),
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

    return filteredOrderRows.map((o) => mapDbOrderToApiOrder(o, itemsByOrder.get(o.id) ?? []));
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

    return mapDbOrderToApiOrder(orderRow, itemRows);
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

