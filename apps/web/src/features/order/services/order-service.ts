"server-only";

import {
  addresses,
  cartItems as cartItemsTable,
  carts as cartsTable,
  desc,
  eq,
  getDatabase,
  inArray,
  orderItems as orderItemsTable,
  orders as ordersTable,
  products as productsTable,
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

export type BankTransferCheckoutPayload = {
  totalOrderPrice?: number;
  shippingAddress: string;
  method?: "BANK_TRANSFER" | "COD" | "RAZORPAY";
  bankTransferDetails?: {
    referenceNumber: string;
    accountName: string;
    proofFile?: string | null;
  };
  products?: Array<{ product: string; quantity: number }>;
};

export async function uploadProofFile(file: File): Promise<{ _id: string; url: string }> {
  if (!file || file.size <= 0) {
    throw new OrderDataError("A valid proof file is required.", 400);
  }

  const allowedTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf",
    "image/heic",
    "image/heif",
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new OrderDataError("Unsupported file type. Please upload PNG, JPG, WebP, or PDF.", 400);
  }

  const fileId = `proof_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  return {
    _id: fileId,
    url: `/uploads/proofs/${fileId}`,
  };
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
    const notesText = payload.bankTransferDetails
      ? `Bank Transfer Ref: ${payload.bankTransferDetails.referenceNumber} | Account: ${payload.bankTransferDetails.accountName}`
      : null;

    // 4. Create Order in DB
    const [createdOrder] = await db
      .insert(ordersTable)
      .values({
        orderNumber: orderNum,
        userId: user?.id ?? null,
        status: "pending",
        paymentMethod: "cod",
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

    // 5. Create Order Items in DB
    for (const item of resolvedItems) {
      await db.insert(orderItemsTable).values({
        orderId: createdOrder.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        total: item.total.toFixed(2),
      });
    }

    // 6. Clear Cart if Cart Flow
    if (!isBuyNow) {
      try {
        const owner = await getCartOwner();
        if (owner.userId) {
          const [cartRow] = await db
            .select()
            .from(cartsTable)
            .where(eq(cartsTable.userId, owner.userId))
            .limit(1);

          if (cartRow) {
            await db.delete(cartItemsTable).where(eq(cartItemsTable.cartId, cartRow.id));
          }
        }
      } catch {
        // Non-blocking error if cart clear fails
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
            key: "placeholder.jpg",
            mimetype: "image/jpeg",
            size: 0,
            thumbnail: true,
          },
        ],
      },
    })),
  };
}

export async function fetchUserOrders() {
  try {
    const user = await getOptionalUser();
    if (!user) return [];

    const db = getDatabase();
    const orderRows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, user.id))
      .orderBy(desc(ordersTable.createdAt));

    if (!orderRows.length) return [];

    const orderIds = orderRows.map((o) => o.id);
    const itemRows = await db
      .select()
      .from(orderItemsTable)
      .where(inArray(orderItemsTable.orderId, orderIds));

    const itemsByOrder = new Map<string, (typeof orderItemsTable.$inferSelect)[]>();
    for (const item of itemRows) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    return orderRows.map((o) => mapDbOrderToApiOrder(o, itemsByOrder.get(o.id) ?? []));
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

