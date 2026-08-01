"server-only";

import {
  and,
  desc,
  eq,
  getDatabase,
  or,
  products as productsTable,
  wishlists as wishlistsTable,
} from "@babascamera/db";
import { getOptionalUser, requireUser } from "@/lib/auth/session";
import type { WishlistItem } from "@/instances/wishlistInstance";

export class WishlistDataError extends Error {
  readonly status: number;

  constructor(message: string, status = 400, cause?: unknown) {
    super(message, { cause });
    this.name = "WishlistDataError";
    this.status = status;
  }
}

function shapeWishlistItem(
  row: typeof wishlistsTable.$inferSelect & {
    product?: typeof productsTable.$inferSelect | null;
  },
  user: { id: string; email?: string; user_metadata?: { full_name?: string } },
): WishlistItem {
  const prod = row.product;
  const salePrice = Number(prod?.salePrice || prod?.mrp || 0);

  return {
    _id: row.id,
    user: {
      _id: user.id,
      name: user.user_metadata?.full_name ?? "User",
      phone: "",
      code: user.id.substring(0, 8),
    },
    product: prod
      ? {
          _id: prod.id,
          id: prod.id,
          name: prod.name,
          slug: prod.slug,
          description: prod.description ?? "",
          shortDescription: prod.shortDescription ?? "",
          mrp: String(prod.mrp),
          salePrice: String(prod.salePrice),
          price: {
            actualPrice: salePrice,
            salePrice,
            discountPrice: 0,
            gst: 0,
            taxStatus: "Inclusive",
          },
          quantity: prod.stock,
          stock: prod.stock,
          images: [],
          category: { id: "cat_1", name: "Category", slug: "category" },
          brand: { id: "brand_1", name: "Brand", slug: "brand" },
          isFeatured: false,
          averageRating: 5,
          reviewCount: 0,
          status: "Active",
          createdAt: prod.createdAt.toISOString(),
          updatedAt: prod.updatedAt.toISOString(),
        }
      : row.productId,
    createdAt: row.createdAt.toISOString(),
  } as unknown as WishlistItem;
}

export async function fetchWishlist(): Promise<WishlistItem[]> {
  try {
    const user = await getOptionalUser();
    if (!user) return [];

    const db = getDatabase();
    const rows = await db
      .select({
        wishlist: wishlistsTable,
        product: productsTable,
      })
      .from(wishlistsTable)
      .innerJoin(productsTable, eq(wishlistsTable.productId, productsTable.id))
      .where(eq(wishlistsTable.userId, user.id))
      .orderBy(desc(wishlistsTable.createdAt));

    return rows.map((r) =>
      shapeWishlistItem(
        {
          ...r.wishlist,
          product: r.product,
        },
        user,
      ),
    );
  } catch (error: unknown) {
    throw new WishlistDataError(
      error instanceof Error ? error.message : "Failed to load wishlist",
      500,
      error,
    );
  }
}

export async function addToWishlist(productId: string): Promise<WishlistItem> {
  if (!productId) {
    throw new WishlistDataError("Product ID is required", 400);
  }

  try {
    const user = await requireUser("/wishlist");
    const db = getDatabase();

    const [existing] = await db
      .select({
        wishlist: wishlistsTable,
        product: productsTable,
      })
      .from(wishlistsTable)
      .innerJoin(productsTable, eq(wishlistsTable.productId, productsTable.id))
      .where(
        and(
          eq(wishlistsTable.userId, user.id),
          eq(wishlistsTable.productId, productId),
        ),
      )
      .limit(1);

    if (existing) {
      return shapeWishlistItem(
        {
          ...existing.wishlist,
          product: existing.product,
        },
        user,
      );
    }

    const [created] = await db
      .insert(wishlistsTable)
      .values({
        userId: user.id,
        productId,
      })
      .returning();

    if (!created) {
      throw new WishlistDataError("Unable to add product to wishlist", 500);
    }

    const [prod] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .limit(1);

    return shapeWishlistItem(
      {
        ...created,
        product: prod ?? null,
      },
      user,
    );
  } catch (error: unknown) {
    if (error instanceof WishlistDataError) throw error;
    throw new WishlistDataError(
      error instanceof Error ? error.message : "Failed to add product to wishlist",
      400,
      error,
    );
  }
}

export async function removeFromWishlist(idOrProductId: string): Promise<boolean> {
  if (!idOrProductId) {
    throw new WishlistDataError("Wishlist or Product ID is required", 400);
  }

  try {
    const user = await requireUser("/wishlist");
    const db = getDatabase();

    await db
      .delete(wishlistsTable)
      .where(
        and(
          eq(wishlistsTable.userId, user.id),
          or(
            eq(wishlistsTable.id, idOrProductId),
            eq(wishlistsTable.productId, idOrProductId),
          ),
        ),
      );

    return true;
  } catch (error: unknown) {
    if (error instanceof WishlistDataError) throw error;
    throw new WishlistDataError(
      error instanceof Error ? error.message : "Failed to remove item from wishlist",
      400,
      error,
    );
  }
}

