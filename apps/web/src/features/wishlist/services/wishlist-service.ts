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

export async function addWishlistProduct(
  userId: string,
  productId: string,
) {
  // Add-only (never toggles): the wishlist heart is an explicit add/remove
  // toggle on the client, and a server-side toggle disagrees with client
  // state whenever the two are out of sync.
  const database = getDatabase();
  await database
    .insert(wishlists)
    .values({ userId, productId })
    .onConflictDoNothing({
      target: [wishlists.userId, wishlists.productId],
    });
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
  // Fetch exactly the wishlisted products by id. The previous approach
  // (filter the 60 newest products) silently dropped wishlisted items that
  // were not among them.
  const wantedIds = ids.map((row) => row.productId);
  const products: CatalogProduct[] = [];
  const chunkSize = 60;
  for (let index = 0; index < wantedIds.length; index += chunkSize) {
    const chunk = wantedIds.slice(index, index + chunkSize);
    products.push(
      ...(await listCatalogProducts({ productIds: chunk, limit: chunk.length })),
    );
  }
  const byId = new Map(products.map((product) => [product.id, product]));
  return wantedIds
    .map((id) => byId.get(id))
    .filter((product): product is CatalogProduct => Boolean(product));
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
    await addWishlistProduct(user.id, productId);
    // Return the item in the same shape fetchWishlist serves, so the client
    // can key its store by product id immediately after adding.
    const products = await listWishlistProducts(user.id);
    const prod = products.find((product) => product.id === productId);
    if (!prod) throw new WishlistDataError("Product not found", 404);
    return {
      _id: prod.id,
      product: {
        _id: prod.id,
        name: prod.name,
        slug: prod.slug,
        images: prod.image ? [{ key: prod.image }] : [],
        price: { salePrice: Number(prod.salePrice), actualPrice: Number(prod.mrp) },
      },
      createdAt: new Date().toISOString(),
    };
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
