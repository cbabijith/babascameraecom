"use client";

import type { StorefrontActionState } from "@/lib/action-state";
// Type-only import from the server module is erased at build time.
import type { CheckoutResult } from "@/lib/commerce/checkout";

/* ------------------------------------------------------------------ */
/* Shared response shapes                                              */
/* ------------------------------------------------------------------ */

export interface AuthActionState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
  redirectTo?: string;
}

export interface CartCouponState {
  ok: boolean;
  message: string;
  code: string | null;
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
}

export type CheckoutActionState =
  | { ok: true; order: CheckoutResult }
  | { ok: false; message: string };

/* ------------------------------------------------------------------ */
/* Fetch plumbing                                                      */
/* ------------------------------------------------------------------ */

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    return (await response.json().catch(() => null)) as T | null;
  } catch (error) {
    console.error(`Request to ${url} failed`, error);
    return null;
  }
}

/** Mirrors the old FormData actions: values are sent as trimmed strings. */
function formDataToJson(formData: FormData): Record<string, string> {
  return Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value)]),
  );
}

function networkFailure(message: string): StorefrontActionState<never> {
  return { success: false, message, error: message };
}

/* ------------------------------------------------------------------ */
/* Storefront mutations                                                */
/* ------------------------------------------------------------------ */

type ApiState<T> = StorefrontActionState<T> & { redirectTo?: string };

export async function addToCartApi(
  formData: FormData,
): Promise<StorefrontActionState<{ itemId: string }>> {
  const body = await postJson<ApiState<{ itemId: string }>>(
    "/api/storefront/cart/items",
    formDataToJson(formData),
  );
  return (
    body ?? networkFailure("This item could not be added. Please try again.")
  );
}

export async function toggleWishlistApi(
  formData: FormData,
): Promise<StorefrontActionState<{ saved: boolean }>> {
  const body = await postJson<ApiState<{ saved: boolean }>>(
    "/api/storefront/wishlist/toggle",
    formDataToJson(formData),
  );
  return (
    body ??
    networkFailure("Your wishlist could not be updated. Please try again.")
  );
}

export async function subscribeNewsletterApi(
  formData: FormData,
): Promise<StorefrontActionState> {
  const body = await postJson<ApiState<unknown>>(
    "/api/storefront/newsletter",
    formDataToJson(formData),
  );
  return body ?? networkFailure("We could not subscribe you. Please try again.");
}

export async function submitReviewApi(
  formData: FormData,
): Promise<StorefrontActionState> {
  const body = await postJson<ApiState<unknown>>(
    "/api/storefront/reviews",
    formDataToJson(formData),
  );
  return (
    body ??
    networkFailure("Your review could not be submitted. Please try again.")
  );
}

/**
 * Applies (or clears, with an empty code) the cart coupon estimate. On
 * failure the previous quote is kept, exactly like the former server action.
 */
export async function previewCartCouponApi(
  previous: CartCouponState,
  formData: FormData,
): Promise<CartCouponState> {
  const rawCode = String(formData.get("couponCode") ?? "").trim();
  const body = await postJson<CartCouponState>("/api/storefront/cart/coupon", {
    couponCode: rawCode,
  });
  if (!body) {
    return {
      ...previous,
      ok: false,
      message: "Coupon could not be checked. Please try again.",
    };
  }
  if (body.ok) {
    return {
      ...body,
      message: !rawCode && !previous.code ? "" : body.message,
    };
  }
  return {
    ...previous,
    ok: false,
    code: null,
    message: body.message,
  };
}

export async function placeOrderApi(
  input: unknown,
): Promise<CheckoutActionState> {
  const body = await postJson<CheckoutActionState>(
    "/api/storefront/checkout",
    input,
  );
  return (
    body ?? { ok: false, message: "Checkout could not be completed. Please try again." }
  );
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export async function signInApi(formData: FormData): Promise<AuthActionState> {
  const payload = formDataToJson(formData);
  const body = await postJson<AuthActionState>(
    "/api/storefront/auth/sign-in",
    payload,
  );
  return body ?? { ok: false, message: "Sign in is temporarily unavailable. Please try again." };
}

export async function signUpApi(formData: FormData): Promise<AuthActionState> {
  const payload = formDataToJson(formData);
  const body = await postJson<AuthActionState>(
    "/api/storefront/auth/sign-up",
    payload,
  );
  return body ?? { ok: false, message: "Account creation is temporarily unavailable. Please try again." };
}

export async function forgotPasswordApi(
  formData: FormData,
): Promise<AuthActionState> {
  const body = await postJson<AuthActionState>(
    "/api/storefront/auth/forgot-password",
    formDataToJson(formData),
  );
  return body ?? { ok: false, message: "Please try again." };
}

export async function resetPasswordApi(
  formData: FormData,
): Promise<AuthActionState> {
  const body = await postJson<AuthActionState>(
    "/api/storefront/auth/reset-password",
    formDataToJson(formData),
  );
  return body ?? { ok: false, message: "The password could not be updated. Please try again." };
}

export async function googleSignInApi(
  next: string,
): Promise<{ ok: boolean; url?: string; redirectTo?: string }> {
  const body = await postJson<{ ok: boolean; url?: string; redirectTo?: string }>(
    "/api/storefront/auth/google",
    { next },
  );
  return body ?? { ok: false, redirectTo: "/login?error=oauth" };
}

export async function signOutApi(): Promise<{
  ok: boolean;
  redirectTo?: string;
}> {
  const body = await postJson<{ ok: boolean; redirectTo?: string }>(
    "/api/storefront/auth/sign-out",
    {},
  );
  return body ?? { ok: true, redirectTo: "/" };
}
