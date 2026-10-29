import "server-only";

import { backendFetchScoped } from "@/lib/backend-fetch";

/**
 * Cart badge count for the site header. The cart lives behind the backend;
 * cookies are forwarded so guest carts and user carts both resolve.
 */
export async function getCartSummary() {
  try {
    const data = await backendFetchScoped<{ success: boolean; data?: { count: number; authenticated: boolean } }>(
      "/api/storefront/cart-summary",
    );
    return {
      count: data?.data?.count ?? 0,
      authenticated: data?.data?.authenticated ?? false,
    };
  } catch (error) {
    console.error("[getCartSummary] backend fetch failed", error);
    return { count: 0, authenticated: false };
  }
}
