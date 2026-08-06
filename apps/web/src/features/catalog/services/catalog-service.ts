"server-only";

import {
  and,
  asc,
  brands,
  categories,
  count,
  desc,
  eq,
  getDatabase,
  gt,
  gte,
  inArray,
  isNotNull,
  lte,
  notInArray,
  or,
  orderItems,
  orders,
  productImages,
  products,
  productVariants,
  reviews,
  sql,
  users,
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
  skipTotal?: boolean;
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
    filters.skipTotal
      ? Promise.resolve([{ value: 0 }])
      : database
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
    return listCatalogProducts({ featured: true, limit, skipTotal: true });
  }
  const productsResult = await listCatalogProducts({
    productIds: ids,
    limit: ids.length,
    skipTotal: true,
  });
  const byId = new Map(productsResult.map((product) => [product.id, product]));
  return ids
    .map((id) => byId.get(id))
    .filter((product): product is CatalogProduct => Boolean(product));
}

export async function getCatalogProduct(
  identifier: string,
): Promise<ProductDetail | null> {
  const database = getDatabase();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
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
    .where(
      and(
        isUuid
          ? or(eq(products.slug, identifier), eq(products.id, identifier))
          : eq(products.slug, identifier),
        eq(products.isActive, true),
      ),
    )
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
