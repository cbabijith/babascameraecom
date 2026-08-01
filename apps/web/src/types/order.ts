import type { ApiResponse } from "@/lib/apiClient";

/* =========================
   UI DOMAIN TYPES
   ========================= */

export type OrderStatus =
  | "PENDING"
  | "PLACED"
  | "CONFIRMED"
  | "DISPATCHED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_OF_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED"
  | "RETURNED"
  | "REFUNDED"
  | "COMPLETED";

export type OrderImage = { key?: string };

export type OrderProductMini = {
  _id?: string;
  name?: string;
  slug?: string; 
  images?: OrderImage[];
  brand?: { name?: string };
};

export type OrderItem = {
  quantity: number;
  product: OrderProductMini | string;
  name?: string;
  price?: number;        
  salePrice?: number;    
  actualPrice?: number;  
  bullets?: string[];
  brandName?: string;
};

export type OrderAddress = {
  name?: string;
  phone?: string;
  alternatePhone?: string;
  building?: string;
  line1?: string;
  line2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  addressType?: string;
  _id?: string;
};

export type OrderDeliveryDetails = {
  trackingId?: string;
  partnerName?: string;
  url?: string;
};

export interface Order {
  /** Basic identifiers */
  _id: string;
  code?: string;
  invoiceCode?: string;

  /** Linked user info */
  user?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    code?: string;
  };

  /** Payment gateway info */
  payment?: {
    _id?: string;
    paymentGateway?: PaymentGateway; // "RAZORPAY" | "NO_PAYMENT" | etc.
    razorpayGatewayDetails?: {
      type?: "PAYMENT_ORDER" | "PAYMENT_LINK";
      orderId?: string; // when type = PAYMENT_ORDER
      paymentLinkId?: string; // when type = PAYMENT_LINK
      paymentLink?: string; // when type = PAYMENT_LINK
    };
  };

  /** Status fields */
  orderStatus: OrderStatus;
  orderPaymentStatus?: string;

  /** Timestamps */
  placedAt?: string;
  createdAt?: string;

  /** Products */
  items: OrderItem[];

  /** Charges */
  deliveryCharges: number;

  /** Summary (right sidebar totals) */
  summary: {
    items: number;          // totalSalePrice or computed
    deliveryCharge: number; // from API
    gst: number;            // taxAmount
    total: number;          // totalOrderPrice
    platformCharges?: number;
  };

  /** Addresses */
  shippingAddress?: OrderAddress;
  deliveryDetails?: OrderDeliveryDetails;
}


/* =========================
   RAW API TYPES (backend) — allow numeric strings
   ========================= */

export type ApiImage = {
  _id: string;
  name: string;
  key: string;
  mimetype: string;
  size: number;
  thumbnail: boolean;
};

export type ApiBrand = {
  _id?: string;
  name?: string;
  image?: ApiImage;
  code?: string;
};

export type ApiProdCore = {
  _id: string;
  name: string;
   slug?: string; 
  images?: ApiImage[];
  code: string;
  brand?: ApiBrand;
  category?: {
    _id: string;
    name: string;
    image?: ApiImage;
    code?: string;
    status?: string;
    visibility?: string;
  };
};

export type ApiOrderProduct = {
  product?: ApiProdCore;
  quantity: number | string;
  actualPrice: number | string;
  discount: number | string;
  salePrice: number | string;
  reduction: number | string;
  totalPrice: number | string;
  orderProductStatus: string;
  _id: string;
  gst?: number | string;
};

export type ApiOrder = {
  _id: string;
  code: string;
  invoiceCode?: string;

  products: ApiOrderProduct[];

  orderStatus: string;
  orderPaymentStatus?: string;

  createdAt: string;

  // Monetary fields (can be number or string depending on endpoint)
  totalSalePrice?: number | string;
  totalReductionAmount?: number | string;
  deliveryCharges?: number | string;
  taxAmount?: number | string;
  platformCharges?: number | string;
  convenienceCharges?: number | string;
  packingCharges?: number | string;
  totalOrderPrice?: number | string;
  totalCapturedAmount?: number | string;

  // Addresses
  shippingAddress?: OrderAddress;
  billingAddress?: OrderAddress;
  deliveryDetails?: {
    trackingId?: string;
    partnerName?: string;
  };
};

export type OrderListResponse = ApiResponse & {
  success?: boolean;
  message?: string;
  results?: ApiOrder[];
  data?: ApiOrder[];
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
};

export type PaymentGateway = "NO_PAYMENT" | "RAZORPAY" | string;

export type ApiTransaction = {
  order?: string;
  user?: string;
  paymentType?: string;     // e.g., "ORDER"
  paymentMode?: string;     // e.g., "PRE-PAID"
  paymentTiming?: string;   // e.g., "IMMEDIATE"
  paymentGateway?: PaymentGateway;
  amount?: number | string;
  dueAmount?: number | string;
  capturedAmount?: number | string;
  refundAmount?: number | string;
  refundPercentage?: number | string;
  status?: string;          // e.g., "SUCCESS"
  razorpayGatewayDetails?: { orderId?: string };
  code?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderDetailResponse = ApiResponse & {
  success?: boolean;
  message?: string;
  result?: ApiOrder;
  data?: ApiOrder;
};

/* =========================
   CREATE ORDER (optional)
   ========================= */

export type CreateOrderRequest = {
  totalOrderPrice: number;
  shippingAddress: string;
};

export type CreateOrderResult = {
  order: Order;
  transaction?: ApiTransaction;
};

export type CreateOrderApiResponse = ApiResponse & {
  result?: ApiOrder | { order: ApiOrder; transaction?: ApiTransaction }; 
  data?:   ApiOrder | { order: ApiOrder; transaction?: ApiTransaction }; 
};
