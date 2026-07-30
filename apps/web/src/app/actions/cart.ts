"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getCartOwner } from "@/lib/cart-session";
import {
  actionFailure,
  validationFailure,
  type StorefrontActionState,
} from "@/lib/action-state";
import {
  addProductToCart,
  toggleWishlistProduct,
  updateCartItemForUser,
} from "@/lib/data/storefront";

const addCartSchema = z.object({
  productId: z.uuid(),
  variantId: z.union([z.uuid(), z.literal("")]).optional(),
  quantity: z.coerce.number().int().min(1).max(10),
});

const updateCartSchema = z.object({
  cartItemId: z.uuid(),
  quantity: z.coerce.number().int().min(0).max(10),
});

export async function addToCartAction(formData: FormData) {
  const parsed = addCartSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const itemId = await addProductToCart({
      owner: await getCartOwner(),
      productId: parsed.data.productId,
      variantId: parsed.data.variantId || null,
      quantity: parsed.data.quantity,
    });
    revalidatePath("/cart");
    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Added to your cart.",
      data: { itemId },
    } satisfies StorefrontActionState<{ itemId: string }>;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Add to cart failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return actionFailure("This item could not be added. Please try again.");
  }
}

export async function updateCartItemAction(formData: FormData) {
  const parsed = updateCartSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateCartItemForUser({
      owner: await getCartOwner(),
      ...parsed.data,
    });
    revalidatePath("/cart");
    revalidatePath("/", "layout");
    return {
      success: true,
      message:
        parsed.data.quantity === 0
          ? "Item removed from your cart."
          : "Cart updated.",
    } satisfies StorefrontActionState;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Cart update failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return actionFailure("Your cart could not be updated. Please try again.");
  }
}

export async function toggleWishlistAction(formData: FormData) {
  const parsed = z
    .object({ productId: z.uuid() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const user = await requireUser("/account/wishlist");
    const saved = await toggleWishlistProduct(user.id, parsed.data.productId);
    revalidatePath("/wishlist");
    revalidatePath("/account/wishlist");
    revalidatePath("/products");
    return {
      success: true,
      message: saved ? "Saved to your wishlist." : "Removed from your wishlist.",
      data: { saved },
    } satisfies StorefrontActionState<{ saved: boolean }>;
  } catch (error) {
    unstable_rethrow(error);
    console.error("Wishlist update failed", {
      type: error instanceof Error ? error.name : typeof error,
    });
    return actionFailure(
      "Your wishlist could not be updated. Please try again.",
    );
  }
}
