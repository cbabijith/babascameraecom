import { AxiosError } from "axios";
import { apiClient } from "@/lib/apiClient";
import type {
  Order,
  OrderStatus,
  OrderItem,
  ApiOrder,
  ApiOrderProduct,
  OrderDetailResponse,
} from "@/types/order";


type PriceRow = {
  totalPrice?: number | string;
  salePrice?: number | string;
  actualPrice?: number | string;
};

type ImageLite = { key: string };
type BrandLite = { name?: string };

type ProductLite = {
  _id?: string;
  name?: string;
  code?: string;
  brand?: BrandLite;
  images?: ImageLite[];
};

export type FlattenedOrderRow = {
  /** API uses either _id or orderId to represent the order */
  _id?: string;
  orderId?: string;
  code?: string;

  /** monetary fields used in totals */
  totalCapturedAmount?: number | string;
  totalOrderPrice?: number | string;
  totalSalePrice?: number | string;
  taxAmount?: number | string;
  platformCharges?: number | string;
  deliveryCharges?: number | string;

  /** row-level (item-level) pricing */
  actualPrice?: number | string;
  salePrice?: number | string;
  totalPrice?: number | string;
  reduction?: number | string;

  /** statuses / meta */
  orderStatus?: string;
  orderPaymentStatus?: string;
  createdAt?: string;

  /** row identity */
  itemId?: string;
  productId?: string;
  quantity?: number | string;

  /** embedded product */
  product?: ProductLite;

  /** optional address blob passed through to UI */
  shippingAddress?: unknown;
  deliveryDetails?: { trackingId?: string; partnerName?: string };
};

/** API list response can return either legacy ApiOrder[] or FlattenedOrderRow[] */
type OrdersListApiResponse = {
  success: boolean;
  message?: string;
  currentPage?: number | string;
  totalCount?: number | string;
  totalPages?: number | string;
  results?: Array<ApiOrder | FlattenedOrderRow>;
  data?: Array<ApiOrder | FlattenedOrderRow>;
};

/* ---------------- helpers ---------------- */

function safeNumber(n: unknown, fallback = 0): number {
  if (typeof n === "number") return Number.isNaN(n) ? fallback : n;
  if (typeof n === "string") {
    const v = parseFloat(n.trim());
    return Number.isNaN(v) ? fallback : v;
  }
  return fallback;
}

function mapStatus(apiStatus?: string): OrderStatus {
  if (!apiStatus) return "PLACED"; // only when truly missing

  // Uppercase and remove spaces/underscores/hyphens to tolerate API variants
  const compact = apiStatus.toUpperCase().replace(/[^A-Z]/g, "");

  // Map variants/aliases to your canonical keys used across UI
  switch (compact) {
    case "PENDING": return "PENDING";
    case "PLACED": return "PLACED";
    case "CONFIRMED": return "CONFIRMED";
    case "COMPLETED": return "CONFIRMED";       // if backend ever sends COMPLETED
    case "DISPATCHED": return "DISPATCHED";
    case "PACKED": return "PACKED";
    case "SHIPPED": return "SHIPPED";
    case "OUTFORDELIVERY": return "OUT_OF_DELIVERY";  // tolerate OUT_FOR_DELIVERY / OUT-FOR-DELIVERY
    case "DELIVERED": return "DELIVERED";
    case "CANCELLED":
    case "CANCELED": return "CANCELLED";
    case "RETURNED": return "RETURNED";
    case "REFUNDED": return "REFUNDED";
    case "FAILED":
    case "PAYMENTFAILED": return "FAILED";
    default: return "PLACED";          // ultra-safe fallback
  }
}

function priceFromRow(row: PriceRow): number {
  return safeNumber(row.totalPrice);
}

function mapItemsFromProducts(rows: ApiOrderProduct[] | undefined): OrderItem[] {
  if (!rows || rows.length === 0) return [];
  return rows.map((r) => {
    const name = r.product?.name ?? "Product";
    const brandName = r.product?.brand?.name;
    const images = (r.product?.images ?? []).map((img) => ({ key: img.key }));
    return {
      product: {
        _id: r.product?._id,
        name,
        images,
        brand: r.product?.brand ? { name: r.product.brand.name } : undefined,
      },
      name,
      price: priceFromRow(r),                 // ← totalPrice (unchanged)
      salePrice: safeNumber(r.salePrice),     // ← NEW
      actualPrice: safeNumber(r.actualPrice),
      bullets: [],
      quantity: safeNumber(r.quantity, 1),
      brandName,
    };
  });
}

/** Type guard for flattened list rows */
function isFlattenedOrderItem(row: unknown): row is FlattenedOrderRow {
  const r = row as FlattenedOrderRow | undefined;
  return !!(
    r &&
    r.itemId &&
    r.product &&
    (r.salePrice != null || r.totalPrice != null || r.actualPrice != null)
  );
}

// Option A: simplest — delete computeOrderTotal or stop using it

function toOrderFromApi(o: ApiOrder): Order {
  const items = mapItemsFromProducts(o.products);
  const deliveryCharges = safeNumber(o.deliveryCharges);
  const gst = safeNumber(o.taxAmount);
  const platformCharges = safeNumber(o.platformCharges);

  return {
    _id: o._id,
    code: o.code,
    invoiceCode: o.invoiceCode,
    user: (o as Partial<Order>)?.user ?? undefined,
    payment: (o as Partial<Order>)?.payment ?? undefined,
    paymentMethod: o.paymentMethod,
    orderStatus: mapStatus(o.orderStatus),
    orderPaymentStatus: o.orderPaymentStatus,
    placedAt: o.createdAt,
    createdAt: o.createdAt,
    items,
    deliveryCharges,
    summary: {
      items: safeNumber(o.totalSalePrice) || items.reduce((s, i) => s + (i.price ?? 0), 0),
      deliveryCharge: deliveryCharges,
      gst,
      // 👇 ALWAYS show totalOrderPrice
      total: safeNumber(o.totalOrderPrice),
      platformCharges,
    },
    shippingAddress: o.shippingAddress,
    deliveryDetails: o.deliveryDetails,
  };
}

function toOrderFromFlatRow(r: FlattenedOrderRow): Order {
  const name = r.product?.name ?? "Product";
  const images = Array.isArray(r.product?.images) ? r.product.images : [];
  const imageKey = images?.[0]?.key;

  const item: OrderItem = {
    product: {
      _id: r.product?._id,
      name,
      images: imageKey ? [{ key: imageKey }] : [],
      brand: r.product?.brand ? { name: r.product.brand?.name } : undefined,
    },
    name,
    price: priceFromRow(r),                 // totalPrice
    salePrice: safeNumber(r.salePrice),     // ← NEW
    actualPrice: safeNumber(r.actualPrice), // 
    bullets: [],
    quantity: safeNumber(r.quantity, 1),
    brandName: r.product?.brand?.name,
  };

  const deliveryCharges = safeNumber(r.deliveryCharges);
  const gst = safeNumber(r.taxAmount);
  const platformCharges = safeNumber(r.platformCharges);

  return {
    _id: r.orderId || r._id || "",
    code: r.code,
    invoiceCode: undefined,
    user: (r as Partial<Order>)?.user ?? undefined,
    payment: (r as Partial<Order>)?.payment ?? undefined,
    orderStatus: mapStatus(r.orderStatus),
    orderPaymentStatus: r.orderPaymentStatus,
    placedAt: r.createdAt,
    createdAt: r.createdAt,
    items: [item],
    deliveryCharges,
    summary: {
      items: safeNumber(r.totalSalePrice) || item.price || 0,
      deliveryCharge: deliveryCharges,
      gst,
      // 👇 ALWAYS show totalOrderPrice
      total: safeNumber(r.totalOrderPrice),
      platformCharges,
    },
    shippingAddress: r.shippingAddress as Order["shippingAddress"],
    deliveryDetails: r.deliveryDetails,
  };
}


function rethrowAxios(error: unknown, fallback: string): never {
  if (error instanceof AxiosError) {
    if (!error.response) throw new Error("Unable to connect to server. Please check your network.");
    const msg =
      (error.response.data as { message?: string } | undefined)?.message ||
      `Server responded with status ${error.response.status}`;
    throw new Error(msg);
  }
  throw new Error(fallback);
}

/* ---------------- types for paginated list ---------------- */

export type OrdersPage = {
  results: Order[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

/* ---------------- API: list (user-scoped) ---------------- */
// only showing the list function; keep the rest of the file as you have

export const getAllOrders = async ({
  page = 1,
  limit = 10,
  q,
  status,
  from,
  to,
  sort, // optional future-proofing; not wired in UI yet
}: {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  sort?: string;
} = {}): Promise<OrdersPage> => {
  try {
    const hasFilters = Boolean(
      (q && q.trim()) || status || from || to || (sort && sort.trim())
    );

    // Build params
    const params: Record<string, string | number> = { page };

    // ✅ Do NOT send `limit` when using search / sort / range (from/to)
    if (!hasFilters) {
      params.limit = limit;
    }

    if (q && q.trim()) params.search = q.trim();
    if (status) params.status = status;
    if (from) params.from = from;
    if (to) params.to = to;
    if (sort && sort.trim()) params.sort = sort.trim();

    const response = await apiClient.get<OrdersListApiResponse>("/order/user", { params });

    const data = response?.data;
    if (!data?.success) {
      throw new Error(data?.message || "Failed to fetch orders");
    }

    const unionRows = (data.results ?? data.data ?? []) as Array<ApiOrder | FlattenedOrderRow>;
    const mapped: Order[] = unionRows.map((row) =>
      isFlattenedOrderItem(row) ? toOrderFromFlatRow(row) : toOrderFromApi(row as ApiOrder)
    );

    return {
      results: mapped,
      totalCount: Number(data.totalCount ?? mapped.length),
      totalPages: Number(data.totalPages ?? 1),
      currentPage: Number(data.currentPage ?? page),
    };
  } catch (error: unknown) {
    rethrowAxios(error, "Unable to connect to server. Please check your network.");
  }
};


/* ---------------- API: detail ---------------- */

export const getOrderById = async (id: string): Promise<Order> => {
  try {
    const response = await apiClient.get<OrderDetailResponse>(`/order/${id}`);
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch order");
    }
    const raw = (response.data.result ?? response.data.data) as ApiOrder | FlattenedOrderRow | undefined;
    if (!raw) throw new Error("Order not found");
    return isFlattenedOrderItem(raw) ? toOrderFromFlatRow(raw) : toOrderFromApi(raw as ApiOrder);
  } catch (error: unknown) {
    rethrowAxios(error, "Unable to connect to server. Please check your network.");
  }
};

/* ---------------- API: invoice download (works for your backend) ---------------- */

/** Safely read error blobs for helpful messages */
async function blobToTextSafe(blob: Blob): Promise<string> {
  try {
    return await blob.text();
  } catch {
    return "";
  }
}


export const fetchInvoiceFile = async (
  orderId: string
): Promise<{ blob: Blob; filename?: string }> => {
  try {
    const response = await apiClient.patch<ArrayBuffer>(
      `/order/generate-invoice/${orderId}`,
      {},
      { responseType: "arraybuffer" }
    );

    const status = response.status ?? 200
    if (status !== 200) {
      const ct = response.headers?.["content-type"] || ""
      if (ct.includes("application/json") || ct.includes("text/")) {
        const txt = await blobToTextSafe(new Blob([response.data]))
        throw new Error(txt || `HTTP ${status} while generating invoice`)
      }
      throw new Error(`HTTP ${status} while generating invoice`)
    }

    const contentDisposition = response.headers?.["content-disposition"] as string | undefined;
    let filename: string | undefined;

    if (contentDisposition) {
      const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(contentDisposition);
      if (match?.[1]) {
        try {
          filename = decodeURIComponent(match[1]);
        } catch {
          filename = match[1];
        }
      }
    }

    const blob = new Blob([response.data], {
      type: response.headers?.["content-type"] || "application/pdf",
    });

    return { blob, filename };
  } catch (error: unknown) {
    rethrowAxios(error, "Failed to download invoice");
  }
};
