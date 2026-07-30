import "server-only";

import { cartSummaryResponseSchema } from "../schemas/cart-summary-schema";

export async function fetchCartSummary(origin: string, cookie: string) {
  const response = await fetch(new URL("/api/storefront/cart-summary", origin), {
    headers: {
      Accept: "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    cache: "no-store",
  });
  const parsed = cartSummaryResponseSchema.safeParse(await response.json());
  if (!response.ok || !parsed.success || !parsed.data.success) {
    throw new Error("Unable to load cart summary.");
  }
  return parsed.data.data;
}
