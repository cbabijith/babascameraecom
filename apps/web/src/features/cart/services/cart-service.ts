"server-only";

import {
  and,
  asc,
  cartItems,
  carts,
  desc,
  eq,
  getDatabase,
  inArray,
  isNull,
  productImages,
  products,
  productVariants,
  sql,
} from "@babascamera/db";
import { getCartOwner } from "@/lib/cart-session";
import type { CartItem } from "@/types/cart";

export class CartDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 400, cause?: unknown) {
    super(message, { cause });
    this.name = "CartDataError";
    this.status = status;
  }
}

export type CartOwner =
  | { userId: string; sessionId?: never }
  | { userId?: never; sessionId: string };

export function isUserCartOwner(
  owner: CartOwner,
): owner is { userId: string; sessionId?: never } {
  return typeof owner.userId === "string";
}

async function ownerCartId(
  database: ReturnType<typeof getDatabase>,
  owner: CartOwner,
): Promise<string | null> {
  const [cart] = await database
    .select({ id: carts.id })
    .from(carts)
    .where(
      isUserCartOwner(owner)
        ? eq(carts.userId, owner.userId)
        : eq(carts.sessionId, owner.sessionId),
    )
    .orderBy(desc(carts.updatedAt))
    .limit(1);
  return cart?.id ?? null;
}

export async function addProductToCart(input: {
  owner: CartOwner;
  productId: string;
  variantId?: string | null;
  quantity: number;
}) {
  const database = getDatabase();
  return database.transaction(async (transaction) => {
    const ownerLock = isUserCartOwner(input.owner)
      ? `user:${input.owner.userId}`
      : `guest:${input.owner.sessionId}`;
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${ownerLock}, 0))`,
    );
    const [product] = await transaction
      .select({ id: products.id, stock: products.stock })
      .from(products)
      .where(and(eq(products.id, input.productId), eq(products.isActive, true)))
      .limit(1);
    if (!product) throw new Error("Product is unavailable.");

    let available = product.stock;
    if (input.variantId) {
      const [variant] = await transaction
        .select({ stock: productVariants.stock })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.id, input.variantId),
            eq(productVariants.productId, input.productId),
          ),
        )
        .limit(1);
      if (!variant) throw new Error("Product option is unavailable.");
      available = Math.min(product.stock, variant.stock);
    }

    const [existingCart] = await transaction
      .select({ id: carts.id })
      .from(carts)
      .where(
        isUserCartOwner(input.owner)
          ? eq(carts.userId, input.owner.userId)
          : eq(carts.sessionId, input.owner.sessionId),
      )
      .orderBy(desc(carts.updatedAt))
      .limit(1);
    let cartId = existingCart?.id ?? null;
    if (!cartId) {
      const [created] = await transaction
        .insert(carts)
        .values(
          isUserCartOwner(input.owner)
            ? { userId: input.owner.userId }
            : {
                sessionId: input.owner.sessionId,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
        )
        .returning({ id: carts.id });
      if (!created) throw new Error("Unable to create cart.");
      cartId = created.id;
    }

    const variantCondition = input.variantId
      ? eq(cartItems.variantId, input.variantId)
      : isNull(cartItems.variantId);
    const [existing] = await transaction
      .select({ id: cartItems.id, quantity: cartItems.quantity })
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.productId, input.productId),
          variantCondition,
        ),
      )
      .limit(1);
    const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
    if (nextQuantity > available) throw new Error("Not enough stock available.");
    if (existing) {
      await transaction
        .update(cartItems)
        .set({ quantity: nextQuantity, updatedAt: new Date() })
        .where(eq(cartItems.id, existing.id));
      return existing.id;
    }
    const [createdItem] = await transaction
      .insert(cartItems)
      .values({
        cartId,
        productId: input.productId,
        variantId: input.variantId ?? null,
        quantity: input.quantity,
      })
      .returning({ id: cartItems.id });
    if (!createdItem) throw new Error("Unable to add item.");
    return createdItem.id;
  });
}

export async function updateCartItemForUser(input: {
  owner: CartOwner;
  cartItemId: string;
  quantity: number;
}) {
  const database = getDatabase();
  const cartId = await ownerCartId(database, input.owner);
  if (!cartId) throw new Error("Cart not found.");
  if (input.quantity === 0) {
    await database
      .delete(cartItems)
      .where(
        and(eq(cartItems.id, input.cartItemId), eq(cartItems.cartId, cartId)),
      );
    return;
  }
  const [item] = await database
    .select({
      id: cartItems.id,
      productStock: products.stock,
      variantStock: productVariants.stock,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(
      and(eq(cartItems.id, input.cartItemId), eq(cartItems.cartId, cartId)),
    )
    .limit(1);
  if (!item) throw new Error("Cart item not found.");
  const available = item.variantStock ?? item.productStock;
  if (input.quantity > available) throw new Error("Not enough stock available.");
  await database
    .update(cartItems)
    .set({ quantity: input.quantity, updatedAt: new Date() })
    .where(eq(cartItems.id, item.id));
}

export async function getCartForOwner(owner: CartOwner) {
  const database = getDatabase();
  const cartId = await ownerCartId(database, owner);
  if (!cartId) return [];
  const rows = await database
    .select({
      id: cartItems.id,
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      variantId: productVariants.id,
      variantName: productVariants.name,
      variantValue: productVariants.value,
      basePrice: products.salePrice,
      additionalPrice: productVariants.additionalPrice,
      quantity: cartItems.quantity,
      stock: products.stock,
      variantStock: productVariants.stock,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(desc(cartItems.createdAt));
  const images = rows.length
    ? await database
        .select({
          productId: productImages.productId,
          url: productImages.url,
        })
        .from(productImages)
        .where(inArray(productImages.productId, rows.map((row) => row.productId)))
        .orderBy(desc(productImages.isPrimary), asc(productImages.position))
    : [];
  const imageByProduct = new Map<string, string>();
  for (const image of images) {
    if (!imageByProduct.has(image.productId)) {
      imageByProduct.set(image.productId, image.url);
    }
  }
  return rows.map((row) => ({
    ...row,
    image: imageByProduct.get(row.productId) ?? null,
  }));
}

export async function getCartCount(owner: CartOwner): Promise<number> {
  const database = getDatabase();
  const cartId = await ownerCartId(database, owner);
  if (!cartId) return 0;
  const rows = await database
    .select({ quantity: cartItems.quantity })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));
  return rows.reduce((total, row) => total + row.quantity, 0);
}

export async function mergeGuestCartIntoUser(
  sessionId: string,
  userId: string,
) {
  const database = getDatabase();
  await database.transaction(async (transaction) => {
    const [guestCart] = await transaction
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.sessionId, sessionId))
      .for("update")
      .limit(1);
    if (!guestCart) return;
    const [userCart] = await transaction
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, userId))
      .for("update")
      .limit(1);
    if (!userCart) {
      await transaction
        .update(carts)
        .set({
          userId,
          sessionId: null,
          expiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(carts.id, guestCart.id));
      return;
    }

    const guestItems = await transaction
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, guestCart.id))
      .orderBy(asc(cartItems.createdAt));
    for (const guestItem of guestItems) {
      const variantCondition = guestItem.variantId
        ? eq(cartItems.variantId, guestItem.variantId)
        : isNull(cartItems.variantId);
      const [existing] = await transaction
        .select({ id: cartItems.id, quantity: cartItems.quantity })
        .from(cartItems)
        .where(
          and(
            eq(cartItems.cartId, userCart.id),
            eq(cartItems.productId, guestItem.productId),
            variantCondition,
          ),
        )
        .limit(1);
      if (existing) {
        const [stock] = await transaction
          .select({
            productStock: products.stock,
            variantStock: productVariants.stock,
          })
          .from(products)
          .leftJoin(
            productVariants,
            guestItem.variantId
              ? eq(productVariants.id, guestItem.variantId)
              : sql`false`,
          )
          .where(eq(products.id, guestItem.productId))
          .limit(1);
        const available =
          stock?.variantStock ?? stock?.productStock ?? existing.quantity;
        await transaction
          .update(cartItems)
          .set({
            quantity: Math.min(
              existing.quantity + guestItem.quantity,
              available,
            ),
            updatedAt: new Date(),
          })
          .where(eq(cartItems.id, existing.id));
      } else {
        await transaction
          .update(cartItems)
          .set({ cartId: userCart.id, updatedAt: new Date() })
          .where(eq(cartItems.id, guestItem.id));
      }
    }
    await transaction.delete(carts).where(eq(carts.id, guestCart.id));
  });
}

/* ---------------- High-level API mapping helpers ---------------- */

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
