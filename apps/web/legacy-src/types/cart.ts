// src/types/cart.ts
import { Product } from "./product";

/* ---------- existing Cart types (unchanged) ---------- */
export interface CartItem {
  _id: string;
  user: string;
  product: Product;
  quantity: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string;
  updatedAt?: string;
}

export interface AddToCartResponse {
  success: boolean;
  message: string;
  result: CartItem;
}

export interface CartResponse {
  success: boolean;
  message: string;
  results: CartItem[];
}

export interface CartUpdateResponse {
  success: boolean;
  message: string;
  result?: CartItem;
}

export interface CartItemCard {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image: string;
  features: string[];
  isSelected: boolean;
  inStock?: boolean;
  originalPrice?: number;
}

export interface CartSummary {
  itemsTotal: number;
  deliveryFee: number;
  gst: number;
  total: number;
  selectedItemsCount: number;
}

// Component Props Types
export interface CartItemProps {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  image: string;
  features: string[];
  isSelected: boolean;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onToggleSelect: (id: string) => void;
}

export interface CartSummaryProps {
  itemsTotal: number;
  deliveryFee: number;
  gst: number;
  total: number;
  onCheckout: () => void;
  isCheckoutDisabled: boolean;
  selectedItemsCount: number;
}

export interface CartPageProps {
  initialItems?: CartItemCard[];
  onCheckout?: () => void;
  onContinueShopping?: () => void;
}

/* ---------- new: Order / Checkout / Buy-Now types ---------- */
export type CartCheckoutResponse = {
  success: boolean;
  message: string; // "Cart checkout successfully"
};

export type CreateOrderPayload = {
  totalOrderPrice: number; // e.g., 2500
  shippingAddress: string; // address _id
  deliveryCharge?: number;
  method?: "RAZORPAY" | "BANK_TRANSFER" | "COD";
  idempotencyKey?: string;
  checkoutSessionId?: string;
  bankTransferDetails?: {
    referenceNumber: string;
    accountName: string;
    proofFile?: string | null;
  };
};

export type PaymentGatewayDetails = {
  type?: string;
  checkoutUrl?: string;
  orderId?: string;
};

export type Transaction = {
  _id: string;
  order: string;
  user: string;
  paymentType: string;
  paymentMode: string;
  paymentTiming: string;
  paymentGateway: string;
  phonepeGatewayDetails?: PaymentGatewayDetails;
  razorpayGatewayDetails?: PaymentGatewayDetails;
  amount: number;        // rupees (your backend sends 988 etc.)
  dueAmount: number;
  capturedAmount: number;
  refundAmount: number;
  refundPercentage?: number;
  status: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  [k: string]: unknown;
};

export type Order = {
  _id: string;
  totalOrderPrice: number;
  shippingAddress: string;
  // other fields are backend-defined; keep flexible:
  [k: string]: unknown;
};

export type OrderCreateResult =
  | {
      success: true;
      message: string;
      result: { order: Order; transaction?: Transaction };
    }
  | {
      success: true;
      message: string;
      result: Order;
    };

export type OrderResponse = {
  success: boolean;
  message: string;
  result: { order: Order; transaction?: Transaction } | Order;
};

export type BuyNowOrderProduct = { product: string; quantity: number };

export type BuyNowOrderPayload = {
  products: BuyNowOrderProduct[]; // [{ product, quantity }]
  shippingAddress: string; // address _id
  invoiceAt: string; // ISO date string
  totalOrderPrice: number; // computed client-side
  deliveryCharge?: number;
  method?: "RAZORPAY" | "BANK_TRANSFER" | "COD";
  idempotencyKey?: string;
  checkoutSessionId?: string;
};

export type BuyNowOrderCreateResult =
  | {
      success: true;
      message: string;
      result: { order: Order; transaction?: Transaction };
    }
  | {
      success: true;
      message: string;
      result: Order;
    };
