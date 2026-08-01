"server-only";

import { getCartOwner } from "@/lib/cart-session";
import {
  addProductToCart,
  getCartForOwner,
  updateCartItemForUser,
} from "@/lib/data/storefront";
import type { CartItem } from "@/types/cart";

export class CartDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 400, cause?: unknown) {
    super(message, { cause });
    this.name = "CartDataError";
    this.status = status;
  }
}

function mapToCartItem(
  row: Awaited<ReturnType<typeof getCartForOwner>>[number],
  userId: string,
): CartItem {
  const basePrice = Number(row.basePrice || 0);
  const addPrice = Number(row.additionalPrice || 0);
  const salePrice = basePrice + addPrice;
  const stock = row.variantStock ?? row.stock ?? 0;

  return {
    _id: row.id,
    user: userId,
    product: {
      _id: row.productId,
      id: row.productId,
      name: row.productName,
      slug: row.productSlug,
      description: "",
      shortDescription: "",
      mrp: String(salePrice),
      salePrice: String(salePrice),
      price: {
        actualPrice: salePrice,
        salePrice,
        discountPrice: 0,
        gst: 0,
        taxStatus: "Inclusive",
      },
      quantity: stock,
      stock,
      images: row.image
        ? [{ id: "img_1", url: row.image, key: row.image, isPrimary: true, altText: row.productName }]
        : [],
      category: { id: "cat_1", name: "Camera Gear", slug: "camera-gear" },
      brand: { id: "brand_1", name: "Baba's Camera", slug: "babas-camera" },
      isFeatured: false,
      averageRating: 5,
      reviewCount: 0,
      status: "Active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as unknown as CartItem["product"],
    quantity: row.quantity,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchCartItems(): Promise<CartItem[]> {
  try {
    const owner = await getCartOwner();
    const rows = await getCartForOwner(owner);
    const userId = owner.userId ?? "guest";
    return rows.map((row) => mapToCartItem(row, userId));
  } catch (error: unknown) {
    throw new CartDataError(
      error instanceof Error ? error.message : "Failed to load cart items",
      500,
      error,
    );
  }
}

export async function addCartProduct(productId: string): Promise<CartItem> {
  if (!productId) {
    throw new CartDataError("Product ID is required", 400);
  }
  try {
    const owner = await getCartOwner();
    const itemId = await addProductToCart({
      owner,
      productId,
      quantity: 1,
    });
    const items = await getCartForOwner(owner);
    const userId = owner.userId ?? "guest";
    const found = items.find((item) => item.id === itemId) ?? items[0];
    if (!found) throw new CartDataError("Cart item could not be retrieved", 500);
    return mapToCartItem(found, userId);
  } catch (error: unknown) {
    if (error instanceof CartDataError) throw error;
    throw new CartDataError(
      error instanceof Error ? error.message : "Failed to add product to cart",
      400,
      error,
    );
  }
}

export async function incrementCartItem(cartItemId: string): Promise<CartItem> {
  if (!cartItemId) {
    throw new CartDataError("Cart item ID is required", 400);
  }
  try {
    const owner = await getCartOwner();
    const items = await getCartForOwner(owner);
    const userId = owner.userId ?? "guest";
    const existing = items.find((item) => item.id === cartItemId);
    if (!existing) throw new CartDataError("Cart item not found", 404);

    await updateCartItemForUser({
      owner,
      cartItemId,
      quantity: existing.quantity + 1,
    });

    const updatedItems = await getCartForOwner(owner);
    const updated = updatedItems.find((item) => item.id === cartItemId) ?? existing;
    return mapToCartItem(updated, userId);
  } catch (error: unknown) {
    if (error instanceof CartDataError) throw error;
    throw new CartDataError(
      error instanceof Error ? error.message : "Failed to increment cart item",
      400,
      error,
    );
  }
}

export async function decrementCartItem(cartItemId: string): Promise<CartItem | null> {
  if (!cartItemId) {
    throw new CartDataError("Cart item ID is required", 400);
  }
  try {
    const owner = await getCartOwner();
    const items = await getCartForOwner(owner);
    const userId = owner.userId ?? "guest";
    const existing = items.find((item) => item.id === cartItemId);
    if (!existing) throw new CartDataError("Cart item not found", 404);

    const nextQty = existing.quantity - 1;
    await updateCartItemForUser({
      owner,
      cartItemId,
      quantity: Math.max(0, nextQty),
    });

    if (nextQty <= 0) return null;

    const updatedItems = await getCartForOwner(owner);
    const updated = updatedItems.find((item) => item.id === cartItemId);
    return updated ? mapToCartItem(updated, userId) : null;
  } catch (error: unknown) {
    if (error instanceof CartDataError) throw error;
    throw new CartDataError(
      error instanceof Error ? error.message : "Failed to decrement cart item",
      400,
      error,
    );
  }
}

export async function removeCartItem(cartItemId: string): Promise<boolean> {
  if (!cartItemId) {
    throw new CartDataError("Cart item ID is required", 400);
  }
  try {
    const owner = await getCartOwner();
    await updateCartItemForUser({
      owner,
      cartItemId,
      quantity: 0,
    });
    return true;
  } catch (error: unknown) {
    if (error instanceof CartDataError) throw error;
    throw new CartDataError(
      error instanceof Error ? error.message : "Failed to remove cart item",
      400,
      error,
    );
  }
}

export async function checkoutCartUser(): Promise<{ message: string }> {
  try {
    const owner = await getCartOwner();
    const items = await getCartForOwner(owner);
    if (!items.length) {
      throw new CartDataError("Your cart is empty", 400);
    }
    return { message: "Cart is ready for server-authoritative checkout." };
  } catch (error: unknown) {
    if (error instanceof CartDataError) throw error;
    throw new CartDataError(
      error instanceof Error ? error.message : "Cart checkout failed",
      400,
      error,
    );
  }
}
