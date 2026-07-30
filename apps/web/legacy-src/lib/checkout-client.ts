"use client";

import { apiClient } from "@/lib/apiClient";

export type ClientCheckoutMethod = "RAZORPAY" | "BANK_TRANSFER" | "COD";

export type AuthoritativeCheckoutQuote = {
  checkoutSessionId: string;
  subtotal: number;
  discount: number;
  delivery: number;
  tax: number;
  paymentFee: number;
  total: number;
  totalMinor: number;
  currency: string;
  paymentMethod: ClientCheckoutMethod;
  idempotencyKey: string;
};

export type CheckoutQuoteInput = {
  mode: "cart" | "buy_now";
  addressId: string;
  paymentMethod: ClientCheckoutMethod;
  idempotencyKey: string;
  items?: Array<{ productId: string; quantity: number }>;
  couponCode?: string;
};

export async function requestCheckoutQuote(
  input: CheckoutQuoteInput,
): Promise<AuthoritativeCheckoutQuote> {
  const { data } = await apiClient.post<{
    success: boolean;
    message?: string;
    result?: AuthoritativeCheckoutQuote;
  }>("/checkout/quote", input, { showToast: false });
  if (!data.success || !data.result?.checkoutSessionId) {
    throw new Error(data.message || "Unable to calculate checkout total.");
  }
  return data.result;
}
