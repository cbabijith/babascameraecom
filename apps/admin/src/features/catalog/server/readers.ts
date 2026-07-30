import {
  and,
  asc,
  count,
  desc,
  db,
  eq,
  ilike,
  isNull,
  or,
  sql,
  products,
  brands,
  categories,
} from "@babascamera/db";

import { requirePermission } from "@/features/auth/server/admin";
import {
  normalizeProductListQuery,
  type ProductExportRow,
  type ProductListPage,
  type ProductListQuery,
} from "@/features/catalog/types";

function iso(value: Date) {
  return value.toISOString();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizeSearch(value?: string | null) {
  return (value ?? "").trim();
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

type SqlCondition = ReturnType<typeof sql>;

function buildStatusCondition(value?: string) {
  if (value === "active") return eq(products.isActive, true);
  if (value === "inactive") return eq(products.isActive, false);
  if (value === "low-stock") {
    return sql`${products.stock} > 0 AND ${products.stock} <= ${products.lowStockThreshold}`;
  }
  return null;
}

function buildInventoryCondition(value?: string) {
  if (value === "in-stock") return sql`${products.stock} > ${products.lowStockThreshold} AND ${products.stock} > 0`;
  if (value === "low-stock") return sql`${products.stock} > 0 AND ${products.stock} <= ${products.lowStockThreshold}`;
  if (value === "out-of-stock") return sql`${products.stock} <= 0`;
  return null;
}

function buildWhere(input: {
  search: string;
  category: string;
  brand: string;
  status?: string;
  inventory?: string;
}) {
  const conditions: SqlCondition[] = [];

  if (input.search) {
    const like = `%${escapeLike(input.search.toLowerCase())}%`;
    const searchCondition = or(
      ilike(sql`lower(${products.name})`, like),
      ilike(products.sku, like),
      sql`exists (select 1 from ${categories} c where c.id = ${products.categoryId} and lower(c.name) like ${like} escape '\\')`,
      sql`exists (select 1 from ${brands} b where b.id = ${products.brandId} and lower(b.name) like ${like} escape '\\')`,
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  if (input.category && input.category !== "all") {
    conditions.push(eq(products.categoryId, input.category));
  }

  if (input.brand && input.brand !== "all") {
    if (input.brand === "none") conditions.push(isNull(products.brandId));
    else conditions.push(eq(products.brandId, input.brand));
  }

  const status = buildStatusCondition(input.status);
  if (status) conditions.push(status);

  const inventory = buildInventoryCondition(input.inventory);
  if (inventory) conditions.push(inventory);

  return conditions.length ? and(...conditions) : undefined;
}

function orderBySort(sort: string, order: "asc" | "desc") {
  const direction = order === "asc" ? asc : desc;
  if (sort === "name") return [direction(products.name)];
  if (sort === "price") return [direction(products.salePrice)];
  if (sort === "stock") return [direction(products.stock)];
  if (sort === "updatedAt") return [direction(products.updatedAt)];
  return [direction(products.createdAt)];
}

async function readProductCount(where?: SqlCondition) {
  const value = await db.select({ value: count() }).from(products).where(where);
  return Number(value[0]?.value ?? 0);
}

export async function getCatalogOptions() {
  await requirePermission("catalog");
  const [catalogCategories, catalogBrands] = await Promise.all([
    db.query.categories.findMany({
      columns: { id: true, name: true, parentId: true, sortOrder: true, isActive: true },
      orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
    }),
    db.query.brands.findMany({
      columns: { id: true, name: true, position: true, isActive: true },
      orderBy: (table, { asc }) => [asc(table.position), asc(table.name)],
    }),
  ]);
  return { categories: catalogCategories, brands: catalogBrands };
}

export async function getProducts() {
  const result = await getProductCatalogPage({});
  return result.rows;
}

export async function getProductCatalogPage(input: ProductListQuery = {}): Promise<ProductListPage> {
  await requirePermission("catalog");
  const parsed = normalizeProductListQuery(input);
  const { status, inventory, sort, order, page, pageSize } = parsed;
  const search = normalizeSearch(parsed.q);
  const category = normalizeSearch(parsed.category);
  const brand = normalizeSearch(parsed.brand);
  const offset = (page - 1) * pageSize;

  const where = buildWhere({ search, category: category || "all", brand: brand || "all", status, inventory });
  const counts = {
    all: await readProductCount(where),
    active: await readProductCount(and(where ?? sql`true`, eq(products.isActive, true))),
    inactive: await readProductCount(and(where ?? sql`true`, eq(products.isActive, false))),
    lowStock: await readProductCount(
      and(where ?? sql`true`, sql`${products.stock} > 0 AND ${products.stock} <= ${products.lowStockThreshold}`),
    ),
  };

  const listRows = await db
    .select({ id: products.id })
    .from(products)
    .where(where)
    .orderBy(...orderBySort(sort, order))
    .limit(pageSize)
    .offset(offset);

  const ids = listRows.map((row) => row.id);
  if (!ids.length) {
    return {
      rows: [],
      total: counts.all,
      page,
      pageSize,
      totalPages: 0,
      counts,
    };
  }

  const rows = await db.query.products.findMany({
    where: (table, { inArray }) => inArray(table.id, ids),
    with: {
      brand: { columns: { id: true, name: true } },
      category: { columns: { id: true, name: true } },
      images: {
        columns: { url: true, isPrimary: true, position: true },
        orderBy: (table, { asc }) => [asc(table.position)],
      },
      variants: { columns: { id: true } },
    },
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  const orderedRows = ids
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<(typeof rows)[number]> => Boolean(row))
    .map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku,
      slug: row.slug,
      salePrice: row.salePrice,
      mrp: row.mrp,
      stock: row.stock,
      threshold: row.lowStockThreshold,
      categoryId: row.categoryId,
      brandId: row.brandId,
      isActive: row.isActive,
      isFeatured: row.isFeatured,
      category: row.category.name,
      brand: row.brand?.name ?? null,
      imageUrl: row.images.find((image) => image.isPrimary)?.url ?? row.images[0]?.url ?? null,
      variantCount: row.variants.length,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    }));

  const total = await readProductCount(where);

  return {
    rows: orderedRows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    counts,
  };
}

export async function getProductCatalogPageForExport(query: ProductListQuery) {
  const parsed = normalizeProductListQuery(query);
  const search = normalizeSearch(parsed.q);
  const where = buildWhere({
    search,
    category: normalizeSearch(parsed.category) || "all",
    brand: normalizeSearch(parsed.brand) || "all",
    status: parsed.status,
    inventory: parsed.inventory,
  });
  const rows = await db.query.products.findMany({
    where: where,
    with: {
      category: { columns: { id: true, name: true } },
      brand: { columns: { id: true, name: true } },
    },
    orderBy: orderBySort(parsed.sort, parsed.order),
    limit: 10_000,
  });
  return rows.map((product): ProductExportRow => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: {
      id: product.category.id,
      name: product.category.name,
    },
    brand: product.brand
      ? {
        id: product.brand.id,
        name: product.brand.name,
      }
      : null,
    mrp: product.mrp,
    salePrice: product.salePrice,
    costPrice: product.costPrice,
    stock: product.stock,
    shortDescription: product.shortDescription,
    description: product.description,
    youtubeUrl: product.youtubeUrl,
    gstRate: product.gstRate,
    priceIncludesGst: product.priceIncludesGst,
    lowStockThreshold: product.lowStockThreshold,
    weight: product.weight,
    shippingFee: product.shippingFee,
    warranty: product.warranty,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
  }));
}

export async function getProduct(id: string) {
  await requirePermission("catalog");
  if (!isUuid(id)) return null;
  const row = await db.query.products.findFirst({
    where: (table, { eq }) => eq(table.id, id),
    with: {
      brand: { columns: { name: true } },
      category: { columns: { name: true } },
      images: { orderBy: (table, { asc }) => [asc(table.position)] },
      variants: { orderBy: (table, { asc }) => [asc(table.createdAt)] },
    },
  });
  if (!row) return null;
  return {
    ...row,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
    images: row.images.map((image) => ({
      ...image,
      createdAt: iso(image.createdAt),
      updatedAt: iso(image.updatedAt),
    })),
    variants: row.variants.map((variant) => ({
      ...variant,
      createdAt: iso(variant.createdAt),
      updatedAt: iso(variant.updatedAt),
    })),
  };
}

export async function getCategories() {
  await requirePermission("catalog");
  const rows = await db.query.categories.findMany({
    with: {
      parent: { columns: { name: true } },
      products: { columns: { id: true } },
    },
    orderBy: (table, { asc }) => [asc(table.parentId), asc(table.sortOrder), asc(table.name)],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.imageUrl,
    parentId: row.parentId,
    parentName: row.parent?.name ?? null,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    productCount: row.products.length,
  }));
}
