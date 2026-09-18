const COUPON_KEY = "babas.cartCouponCode";

export function getAppliedCouponCode(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(COUPON_KEY) || null;
}

export function setAppliedCouponCode(code: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COUPON_KEY, code.trim().toUpperCase());
}

export function clearAppliedCouponCode(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(COUPON_KEY);
}

export interface CouponPreview {
  ok: boolean;
  message: string;
  code: string | null;
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
}

export async function previewCoupon(code: string): Promise<CouponPreview> {
  const res = await fetch("/api/storefront/cart/coupon", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ couponCode: code }),
  });
  return res.json();
}
