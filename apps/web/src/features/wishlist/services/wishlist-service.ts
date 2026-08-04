"server-only";

import {
  and,
  desc,
  eq,
  getDatabase,
  wishlists,
} from "@babascamera/db";
import { getOptionalUser } from "@/lib/auth/session";
import {
  listCatalogProducts,
  type CatalogProduct,
} from "@/features/catalog/services/catalog-service";

export class WishlistDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 400, cause?: unknown) {
    super(message, { cause });
    this.name = "WishlistDataError";
    this.status = status;
  }
}

export async function toggleWishlistProduct(
  userId: string,
  productId: string,
) {
  const database = getDatabase();
  const [existing] = await database
    .select({ id: wishlists.id })
    .from(wishlists)
    .where(
      and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)),
    )
    .limit(1);
  if (existing) {
    await database.delete(wishlists).where(eq(wishlists.id, existing.id));
    return false;
  }
  await database.insert(wishlists).values({ userId, productId });
  return true;
}

export async function listWishlistProducts(
  userId: string,
): Promise<CatalogProduct[]> {
  const ids = await getDatabase()
    .select({ productId: wishlists.productId })
    .from(wishlists)
    .where(eq(wishlists.userId, userId))
    .orderBy(desc(wishlists.createdAt));
  if (!ids.length) return [];
  const productsById = await listCatalogProducts({ limit: 60 });
  const wanted = new Set(ids.map((row) => row.productId));
  return productsById.filter((product) => wanted.has(product.id));
}

/* ---------------- High-level API mapping helpers ---------------- */

export async function fetchWishlist() {
  try {
    const user = await getOptionalUser();
    if (!user) return [];
    const products = await listWishlistProducts(user.id);
    return products.map((prod) => ({
      _id: prod.id,
      product: {
        _id: prod.id,
        name: prod.name,
        slug: prod.slug,
        images: prod.image ? [{ key: prod.image }] : [],
        price: { salePrice: Number(prod.salePrice), actualPrice: Number(prod.mrp) },
      },
      createdAt: new Date().toISOString(),
    }));
  } catch (error: unknown) {
    throw new WishlistDataError(
      error instanceof Error ? error.message : "Failed to fetch wishlist",
      500,
      error,
    );
  }
}

export async function addToWishlist(productId: string) {
  if (!productId) throw new WishlistDataError("Product ID is required", 400);
  try {
    const user = await getOptionalUser();
    if (!user) throw new WishlistDataError("Authentication required", 401);
    await toggleWishlistProduct(user.id, productId);
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof WishlistDataError) throw error;
    throw new WishlistDataError(
      error instanceof Error ? error.message : "Failed to add to wishlist",
      400,
      error,
    );
  }
}

export async function removeFromWishlist(productId: string) {
  if (!productId) throw new WishlistDataError("Product ID is required", 400);
  try {
    const user = await getOptionalUser();
    if (!user) throw new WishlistDataError("Authentication required", 401);
    const database = getDatabase();
    await database
      .delete(wishlists)
      .where(and(eq(wishlists.userId, user.id), eq(wishlists.productId, productId)));
    return { success: true };
  } catch (error: unknown) {
    if (error instanceof WishlistDataError) throw error;
    throw new WishlistDataError(
      error instanceof Error ? error.message : "Failed to remove from wishlist",
      400,
      error,
    );
  }
}
