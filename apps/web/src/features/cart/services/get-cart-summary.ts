import "server-only";

import { getCartOwner } from "@/lib/cart-session";
import { getCartCount, isUserCartOwner } from "@/lib/data/storefront";

export async function getCartSummary() {
  const owner = await getCartOwner();
  return {
    count: await getCartCount(owner),
    authenticated: isUserCartOwner(owner),
  };
}
