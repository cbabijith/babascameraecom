import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCartOwner } from "@/lib/cart-session";
import {
  addProductToCart,
  updateCartItemForUser,
} from "@/lib/data/storefront";
import {
  crossOriginFailure,
  isSameOrigin,
  readJsonBody,
  storefrontFailure,
  storefrontSuccess,
  validationFailureResponse,
} from "@/lib/api/storefront-api";

export const dynamic = "force-dynamic";

const addCartSchema = z.object({
  productId: z.uuid(),
  variantId: z.union([z.uuid(), z.literal("")]).optional(),
  quantity: z.coerce.number().int().min(1).max(10),
});

const updateCartSchema = z.object({
  cartItemId: z.uuid(),
  quantity: z.coerce.number().int().min(0).max(10),
});

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = addCartSchema.safeParse(body);
  if (!parsed.success) return validationFailureResponse(parsed.error);
  try {
    const itemId = await addProductToCart({
      owner: await getCartOwner(),
      productId: parsed.data.productId,
      variantId: parsed.data.variantId || null,
      quantity: parsed.data.quantity,
    });
    revalidatePath("/cart");
    revalidatePath("/", "layout");
    return storefrontSuccess("Added to your cart.", { itemId });
  } catch (error) {
    console.error("Add to cart failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return storefrontFailure(
      "This item could not be added. Please try again.",
      500,
    );
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return crossOriginFailure();
  const body = await readJsonBody(request);
  const parsed = updateCartSchema.safeParse(body);
  if (!parsed.success) return validationFailureResponse(parsed.error);
  try {
    await updateCartItemForUser({
      owner: await getCartOwner(),
      ...parsed.data,
    });
    revalidatePath("/cart");
    revalidatePath("/", "layout");
    return storefrontSuccess(
      parsed.data.quantity === 0
        ? "Item removed from your cart."
        : "Cart updated.",
    );
  } catch (error) {
    console.error("Cart update failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return storefrontFailure(
      "Your cart could not be updated. Please try again.",
      500,
    );
  }
}
