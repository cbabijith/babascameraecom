// src/instances/cartInstance.ts
import { apiClient } from "@/lib/apiClient";
import {
  CartItem,
  AddToCartResponse,
  CartResponse,
  CartUpdateResponse,
  CartCheckoutResponse,
  CreateOrderPayload,
  Order,
  OrderResponse,
  Transaction,
  BuyNowOrderCreateResult,
  OrderCreateResult,
} from "@/types/cart";

/* ------------------- existing cart APIs (unchanged) ------------------- */
export const addToCart = async (productId: string): Promise<CartItem> => {
  const response = await apiClient.post<AddToCartResponse>(`/cart/product/${productId}`);
  if (response.data.success) return response.data.result;
  throw new Error(response.data.message || "Failed to add product to cart");
};

export const getCart = async (): Promise<CartItem[]> => {
  const response = await apiClient.get<CartResponse>("/cart");
  if (response.data.success) return response.data.results || [];
  throw new Error(response.data.message || "Failed to fetch cart");
};

export const incrementCartItem = async (cartItemId: string): Promise<CartItem> => {
  const response = await apiClient.patch<CartUpdateResponse>(`/cart/increment/${cartItemId}`);
  if (response.data.success && response.data.result) return response.data.result;
  throw new Error(response.data.message || "Failed to increment item quantity");
};

export const decrementCartItem = async (cartItemId: string): Promise<CartItem> => {
  const response = await apiClient.patch<CartUpdateResponse>(`/cart/decrement/${cartItemId}`);
  if (response.data.success && response.data.result) return response.data.result;
  throw new Error(response.data.message || "Failed to decrement item quantity");
};

export const deleteCartItem = async (itemId: string) => {
  await apiClient.delete(`/cart/${itemId}`);
  return true;
};

export const checkoutCart = async (): Promise<CartCheckoutResponse> => {
  const response = await apiClient.patch<CartCheckoutResponse>("/cart/checkout/user");
  if (response.data?.success) return response.data;
  throw new Error(response.data?.message || "Failed to checkout cart");
};

/* ------------------- helpers / type guards ------------------- */
const hasOrderAndMaybeTransaction = (
  value: unknown
): value is { order: Order; transaction?: Transaction } => {
  if (typeof value !== "object" || value === null) return false;
  return Object.prototype.hasOwnProperty.call(value as Record<string, unknown>, "order");
};

/* ------------------- order (cart flow) ------------------- */
export const createOrder = async (
  payload: CreateOrderPayload
): Promise<{ order: Order; transaction?: Transaction }> => {
  const { data } = await apiClient.post<OrderResponse>("/order/user", payload);
  if (!data?.success) throw new Error((data as { message?: string })?.message || "Failed to place order");

  const result = data.result as OrderCreateResult["result"];
  if (hasOrderAndMaybeTransaction(result)) {
    return { order: result.order, transaction: result.transaction };
  }
  return { order: result as unknown as Order };
};

/* ------------------- buy-now flow ------------------- */
type BuyNowMethod = "RAZORPAY" | "BANK_TRANSFER" | "COD";
type BuyNowOrderPayloadWide = {
  products: Array<{ product: string; quantity: number }>;
  shippingAddress: string;
  invoiceAt?: string;
  totalOrderPrice: number;
  deliveryCharge?: number;
  method?: BuyNowMethod; 
  idempotencyKey?: string;
  checkoutSessionId?: string;
  bankTransferDetails?: {
    referenceNumber: string;
    accountName: string;
    proofFile?: string | null;
  };
};

export const createBuyNowOrder = async (
  payload: BuyNowOrderPayloadWide
): Promise<{ order: Order; transaction?: Transaction }> => {
  const { data } = await apiClient.post<BuyNowOrderCreateResult>("/order/buy-now", payload);
  if (!data?.success) {
    throw new Error((data as { message?: string })?.message || "Failed to place buy now order");
  }
  const result = data.result;
  if (hasOrderAndMaybeTransaction(result)) {
    return { order: result.order, transaction: result.transaction };
  }
  return { order: result as Order };
};
