import "server-only";

import {
  addresses,
  and,
  asc,
  brands,
  cartItems,
  carts,
  categories,
  count,
  desc,
  eq,
  getDatabase,
  gt,
  gte,
  inArray,
  isNull,
  isNotNull,
  lte,
  newsletterSubscriptions,
  notInArray,
  orderItems,
  orders,
  productImages,
  products,
  productVariants,
  reviews,
  sql,
  users,
  wishlists,
} from "@babascamera/db";
import { decimalToPaise, paiseToDecimal } from "@/lib/commerce/money";

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  brandName: string | null;
  brandSlug: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  mrp: string;
  salePrice: string;
  stock: number;
  isFeatured: boolean;
  image: string | null;
  defaultVariantId: string | null;
  averageRating: number;
  reviewCount: number;
}

export type ProductDetail = CatalogProduct & {
  sku: string;
  weight: string | null;
  lowStockThreshold: number;
  images: {
    id: string;
    url: string;
    altText: string | null;
    isPrimary: boolean;
  }[];
  variants: {
    id: string;
    name: string;
    value: string;
    additionalPrice: string;
    stock: number;
  }[];
};

export type CartOwner =
  | { userId: string; sessionId?: never }
  | { userId?: never; sessionId: string };

export function isUserCartOwner(
  owner: CartOwner,
): owner is { userId: string; sessionId?: never } {
  return typeof owner.userId === "string";
}

export interface CatalogFilters {
  query?: string;
  categorySlug?: string;
  categorySlugs?: string[];
  brandSlug?: string;
  brandSlugs?: string[];
  featured?: boolean;
  minPrice?: string;
  maxPrice?: string;
  minRating?: number;
  inStock?: boolean;
  sort?: "featured" | "newest" | "price-asc" | "price-desc" | "rating";
  productIds?: string[];
  limit?: number;
  offset?: number;
}

export async function listCatalogProductsPage(
  filters: CatalogFilters = {},
) {
  const database = getDatabase();
  const conditions = [eq(products.isActive, true)];
  if (filters.featured) conditions.push(eq(products.isFeatured, true));
  if (filters.productIds?.length) {
    conditions.push(inArray(products.id, filters.productIds));
  }
  if (filters.categorySlug) {
    conditions.push(
      sql<boolean>`${products.categoryId} in (
        with recursive category_tree as (
          select id from categories where slug = ${filters.categorySlug}
          union all
          select child.id
          from categories child
          join category_tree parent on child.parent_id = parent.id
        )
        select id from category_tree
      )`,
    );
  }
  if (filters.categorySlugs?.length) {
    conditions.push(inArray(categories.slug, filters.categorySlugs));
  }
  if (filters.brandSlug) conditions.push(eq(brands.slug, filters.brandSlug));
  if (filters.brandSlugs?.length) {
    conditions.push(inArray(brands.slug, filters.brandSlugs));
  }
  if (filters.query?.trim()) {
    const query = filters.query.trim();
    const pattern = `%${query.toLowerCase()}%`;
    conditions.push(
      sql<boolean>`(
        (
          setweight(to_tsvector('simple', coalesce(${products.name}, '')), 'A')
          || setweight(to_tsvector('simple', coalesce(${products.sku}, '')), 'A')
          || setweight(to_tsvector('simple', coalesce(${products.shortDescription}, '')), 'B')
          || setweight(to_tsvector('simple', coalesce(${products.description}, '')), 'C')
          || setweight(to_tsvector('simple', coalesce(${products.metaTitle}, '')), 'B')
          || setweight(to_tsvector('simple', coalesce(${products.metaDescription}, '')), 'C')
        ) @@ websearch_to_tsquery('simple', ${query})
        or lower(coalesce(${brands.name}, '')) like ${pattern}
        or lower(coalesce(${categories.name}, '')) like ${pattern}
      )`,
    );
  }
  if (filters.minPrice) {
    conditions.push(gte(products.salePrice, filters.minPrice));
  }
  if (filters.maxPrice) {
    conditions.push(lte(products.salePrice, filters.maxPrice));
  }
  if (filters.inStock) conditions.push(gt(products.stock, 0));
  if (filters.minRating && filters.minRating > 0) {
    conditions.push(
      sql<boolean>`coalesce((
        select avg(rating)
        from reviews
        where product_id = ${products.id} and is_approved = true
      ), 0) >= ${filters.minRating}`,
    );
  }

  const pageSize = Math.min(Math.max(filters.limit ?? 24, 1), 60);
  const offset = Math.max(filters.offset ?? 0, 0);
  const averageRating = sql<number>`coalesce((
    select avg(rating)
    from reviews
    where product_id = ${products.id} and is_approved = true
  ), 0)`.mapWith(Number);
  const reviewCount = sql<number>`(
    select count(*)
    from reviews
    where product_id = ${products.id} and is_approved = true
  )`.mapWith(Number);
  const sortExpression =
    filters.sort === "featured"
      ? desc(products.isFeatured)
      : filters.sort === "price-asc"
      ? asc(products.salePrice)
      : filters.sort === "price-desc"
        ? desc(products.salePrice)
        : filters.sort === "rating"
          ? desc(averageRating)
          : desc(products.createdAt);

  const [rows, totalRows] = await Promise.all([
    database
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        shortDescription: products.shortDescription,
        description: products.description,
        brandName: brands.name,
        brandSlug: brands.slug,
        categoryName: categories.name,
        categorySlug: categories.slug,
        mrp: products.mrp,
        salePrice: products.salePrice,
        stock: products.stock,
        isFeatured: products.isFeatured,
        averageRating,
        reviewCount,
      })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(sortExpression, desc(products.createdAt))
      .limit(pageSize)
      .offset(offset),
    database
      .select({ value: count() })
      .from(products)
      .leftJoin(brands, eq(products.brandId, brands.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(...conditions)),
  ]);

  if (rows.length === 0) {
    return { products: [], total: totalRows[0]?.value ?? 0 };
  }
  const productIds = rows.map((row) => row.id);
  const [images, variants] = await Promise.all([
    database
      .select({
        productId: productImages.productId,
        url: productImages.url,
        position: productImages.position,
        isPrimary: productImages.isPrimary,
      })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(desc(productImages.isPrimary), asc(productImages.position)),
    database
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        stock: productVariants.stock,
        additionalPrice: productVariants.additionalPrice,
      })
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds))
      .orderBy(asc(productVariants.createdAt)),
  ]);

  const firstImage = new Map<string, string>();
  for (const image of images) {
    if (!firstImage.has(image.productId)) {
      firstImage.set(image.productId, image.url);
    }
  }
  const firstVariant = new Map<
    string,
    { id: string; stock: number; additionalPrice: string }
  >();
  for (const variant of variants) {
    const current = firstVariant.get(variant.productId);
    if (!current || (current.stock <= 0 && variant.stock > 0)) {
      firstVariant.set(variant.productId, {
        id: variant.id,
        stock: variant.stock,
        additionalPrice: variant.additionalPrice,
      });
    }
  }
  return {
    products: rows.map((row) => {
      const defaultVariant = firstVariant.get(row.id);
      return {
        ...row,
        mrp: defaultVariant
          ? paiseToDecimal(
              decimalToPaise(row.mrp) +
                decimalToPaise(defaultVariant.additionalPrice),
            )
          : row.mrp,
        salePrice: defaultVariant
          ? paiseToDecimal(
              decimalToPaise(row.salePrice) +
                decimalToPaise(defaultVariant.additionalPrice),
            )
          : row.salePrice,
        stock: defaultVariant
          ? Math.min(row.stock, defaultVariant.stock)
          : row.stock,
        image: firstImage.get(row.id) ?? null,
        defaultVariantId: defaultVariant?.id ?? null,
      };
    }),
    total: totalRows[0]?.value ?? 0,
  };
}

export async function listCatalogProducts(
  filters: CatalogFilters = {},
): Promise<CatalogProduct[]> {
  return (await listCatalogProductsPage(filters)).products;
}

export async function listBestSellingProducts(limit = 8) {
  const rows = await getDatabase()
    .select({
      productId: orderItems.productId,
      quantity: sql<number>`sum(${orderItems.quantity})`.mapWith(Number),
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.paymentStatus, "paid"),
        notInArray(orders.status, ["cancelled", "refunded"]),
        isNotNull(orderItems.productId),
      ),
    )
    .groupBy(orderItems.productId)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(Math.min(Math.max(limit, 1), 24));
  const ids = rows
    .map((row) => row.productId)
    .filter((id): id is string => Boolean(id));
  if (!ids.length) {
    return listCatalogProducts({ featured: true, limit });
  }
  const productsResult = await listCatalogProducts({
    productIds: ids,
    limit: ids.length,
  });
  const byId = new Map(productsResult.map((product) => [product.id, product]));
  return ids
    .map((id) => byId.get(id))
    .filter((product): product is CatalogProduct => Boolean(product));
}

export async function getCatalogProduct(
  slug: string,
): Promise<ProductDetail | null> {
  const database = getDatabase();
  const [row] = await database
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      shortDescription: products.shortDescription,
      description: products.description,
      sku: products.sku,
      weight: products.weight,
      lowStockThreshold: products.lowStockThreshold,
      brandName: brands.name,
      brandSlug: brands.slug,
      categoryName: categories.name,
      categorySlug: categories.slug,
      mrp: products.mrp,
      salePrice: products.salePrice,
      stock: products.stock,
      isFeatured: products.isFeatured,
      averageRating: sql<number>`coalesce((
        select avg(rating)
        from reviews
        where product_id = ${products.id} and is_approved = true
      ), 0)`.mapWith(Number),
      reviewCount: sql<number>`(
        select count(*)
        from reviews
        where product_id = ${products.id} and is_approved = true
      )`.mapWith(Number),
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.isActive, true)))
    .limit(1);
  if (!row) return null;

  const [images, variants] = await Promise.all([
    database
      .select({
        id: productImages.id,
        url: productImages.url,
        altText: productImages.altText,
        isPrimary: productImages.isPrimary,
      })
      .from(productImages)
      .where(eq(productImages.productId, row.id))
      .orderBy(desc(productImages.isPrimary), asc(productImages.position)),
    database
      .select({
        id: productVariants.id,
        name: productVariants.name,
        value: productVariants.value,
        additionalPrice: productVariants.additionalPrice,
        stock: productVariants.stock,
      })
      .from(productVariants)
      .where(eq(productVariants.productId, row.id))
      .orderBy(asc(productVariants.createdAt)),
  ]);
  return {
    ...row,
    images,
    variants,
    image: images[0]?.url ?? null,
    defaultVariantId:
      variants.find((variant) => variant.stock > 0)?.id ??
      variants[0]?.id ??
      null,
  };
}

export async function listCategories() {
  return getDatabase()
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
      description: categories.description,
      imageUrl: categories.imageUrl,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.name));
}

export async function listBrands() {
  return getDatabase()
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      description: brands.description,
      logoUrl: brands.logoUrl,
    })
    .from(brands)
    .where(eq(brands.isActive, true))
    .orderBy(asc(brands.name));
}

export async function listApprovedProductReviews(productId: string) {
  return getDatabase()
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      createdAt: reviews.createdAt,
      customerName: users.fullName,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(
      and(
        eq(reviews.productId, productId),
        eq(reviews.isApproved, true),
      ),
    )
    .orderBy(desc(reviews.createdAt));
}

export async function getUserProductReview(
  userId: string,
  productId: string,
) {
  const [review] = await getDatabase()
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.userId, userId),
        eq(reviews.productId, productId),
      ),
    )
    .limit(1);
  return review ?? null;
}

export async function upsertProductReview(input: {
  userId: string;
  productId: string;
  rating: number;
  title: string | null;
  body: string | null;
}) {
  const [product] = await getDatabase()
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, input.productId), eq(products.isActive, true)))
    .limit(1);
  if (!product) throw new Error("Product not found.");
  await getDatabase()
    .insert(reviews)
    .values({
      userId: input.userId,
      productId: input.productId,
      rating: input.rating,
      title: input.title,
      body: input.body,
      isApproved: false,
    })
    .onConflictDoUpdate({
      target: [reviews.userId, reviews.productId],
      set: {
        rating: input.rating,
        title: input.title,
        body: input.body,
        isApproved: false,
        updatedAt: new Date(),
      },
    });
}

export async function listRelatedProducts(
  product: Pick<ProductDetail, "id" | "categorySlug">,
  limit = 4,
) {
  if (!product.categorySlug) return [];
  const candidates = await listCatalogProducts({
    categorySlug: product.categorySlug,
    limit: Math.min(limit + 1, 12),
  });
  return candidates
    .filter((candidate) => candidate.id !== product.id)
    .slice(0, limit);
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

export async function getUserProfile(userId: string) {
  const [profile] = await getDatabase()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return profile ?? null;
}

export async function listUserAddresses(userId: string) {
  return getDatabase()
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
}

export async function updateUserProfile(input: {
  userId: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
}) {
  const [profile] = await getDatabase()
    .update(users)
    .set({
      fullName: input.fullName,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, input.userId), eq(users.isActive, true)))
    .returning({
      id: users.id,
      fullName: users.fullName,
      phone: users.phone,
      avatarUrl: users.avatarUrl,
    });
  if (!profile) throw new Error("Active profile not found.");
  return profile;
}

export async function createUserAddress(input: {
  userId: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}) {
  const database = getDatabase();
  return database.transaction(async (transaction) => {
    if (input.isDefault) {
      await transaction
        .update(addresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(addresses.userId, input.userId));
    }
    const [created] = await transaction
      .insert(addresses)
      .values(input)
      .returning();
    if (!created) throw new Error("Unable to save address.");
    return created;
  });
}

export async function removeUserAddress(userId: string, addressId: string) {
  await getDatabase()
    .delete(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));
}

export async function setDefaultUserAddress(
  userId: string,
  addressId: string,
) {
  const database = getDatabase();
  await database.transaction(async (transaction) => {
    const [owned] = await transaction
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .limit(1);
    if (!owned) throw new Error("Address not found.");
    await transaction
      .update(addresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(addresses.userId, userId));
    await transaction
      .update(addresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(addresses.id, addressId));
  });
}

export async function subscribeNewsletter(
  email: string,
  fullName?: string | null,
) {
  await getDatabase()
    .insert(newsletterSubscriptions)
    .values({
      email,
      fullName: fullName || null,
      source: "storefront",
      isActive: true,
      unsubscribedAt: null,
      subscribedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: newsletterSubscriptions.email,
      set: {
        fullName: fullName || null,
        isActive: true,
        unsubscribedAt: null,
        subscribedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}
