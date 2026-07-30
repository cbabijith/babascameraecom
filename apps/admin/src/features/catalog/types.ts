export interface CatalogOption {
  id: string;
  name: string;
  isActive: boolean;
  parentId?: string | null;
  sortOrder?: number;
  position?: number;
}

export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  parentName: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
}

export interface BrandListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  position: number;
  isActive: boolean;
  productCount: number;
}

export type BrandStatusFilter = "all" | "active" | "inactive";

export interface BrandListQuery {
  q: string;
  status: BrandStatusFilter;
}

export interface ProductListItem {
  id: string;
  name: string;
  sku: string;
  slug: string;
  salePrice: string;
  mrp: string;
  stock: number;
  threshold: number;
  categoryId: string;
  brandId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  category: string;
  brand: string | null;
  imageUrl: string | null;
  variantCount: number;
  createdAt: string;
  updatedAt: string;
}

export type ProductListStatus = "all" | "active" | "inactive" | "low-stock";
export type ProductInventoryFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";
export type ProductSortField = "name" | "price" | "stock" | "createdAt" | "updatedAt";
export type ProductSortDirection = "asc" | "desc";

export interface ProductListFilters {
  q?: string;
  status?: ProductListStatus;
  category?: string;
  brand?: string;
  inventory?: ProductInventoryFilter;
  sort?: ProductSortField;
  order?: ProductSortDirection;
  page?: number;
  pageSize?: number;
}

export type ProductListQuery = ProductListFilters;

export interface NormalizedProductListQuery {
  q: string;
  status: ProductListStatus;
  category: string;
  brand: string;
  inventory: ProductInventoryFilter;
  sort: ProductSortField;
  order: ProductSortDirection;
  page: number;
  pageSize: number;
}

export function normalizeProductListQuery(query?: ProductListQuery | Record<string, string | undefined>): NormalizedProductListQuery {
  const rawStatus = typeof query?.status === "string" ? (query.status as string) : "all";
  const rawInventory = typeof query?.inventory === "string" ? (query.inventory as string) : "all";
  const rawSort = typeof query?.sort === "string" ? (query.sort as string) : "createdAt";
  const rawOrder = typeof query?.order === "string" ? (query.order as string) : "desc";

  return {
    q: typeof query?.q === "string" ? query.q : "",
    status: rawStatus === "active" || rawStatus === "inactive" || rawStatus === "low-stock" ? rawStatus : "all",
    category: typeof query?.category === "string" ? query.category : "all",
    brand: typeof query?.brand === "string" ? query.brand : "all",
    inventory: rawInventory === "in-stock" || rawInventory === "low-stock" || rawInventory === "out-of-stock"
      ? rawInventory
      : "all",
    sort: rawSort === "name" || rawSort === "price" || rawSort === "stock" || rawSort === "updatedAt" || rawSort === "createdAt"
      ? rawSort
      : "createdAt",
    order: rawOrder === "asc" ? "asc" : "desc",
    page: Number.isFinite(Number(query?.page)) && Number(query?.page) > 0 ? Math.trunc(Number(query?.page)) : 1,
    pageSize: Number.isFinite(Number(query?.pageSize)) && Number(query?.pageSize) > 0
      ? Math.min(100, Math.max(1, Math.trunc(Number(query?.pageSize))))
      : 25,
  };
}

export function buildProductListParams(state: NormalizedProductListQuery) {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.status !== "all") params.set("status", state.status);
  if (state.category !== "all") params.set("category", state.category);
  if (state.brand !== "all") params.set("brand", state.brand);
  if (state.inventory !== "all") params.set("inventory", state.inventory);
  if (state.sort !== "createdAt") params.set("sort", state.sort);
  if (state.order !== "desc") params.set("order", state.order);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.pageSize !== 25) params.set("pageSize", String(state.pageSize));
  return params;
}

export interface ProductExportRow {
  id: string;
  name: string;
  sku: string;
  category: {
    id: string;
    name: string;
  };
  brand: {
    id: string;
    name: string;
  } | null;
  mrp: string;
  salePrice: string;
  costPrice: string | null;
  stock: number;
  shortDescription: string | null;
  description: string | null;
  youtubeUrl: string | null;
  gstRate: string | null;
  priceIncludesGst: boolean;
  lowStockThreshold: number;
  weight: string | null;
  shippingFee: string | null;
  warranty: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  isFeatured: boolean;
}

export interface ProductListPage {
  rows: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: {
    all: number;
    active: number;
    inactive: number;
    lowStock: number;
  };
}

export interface ProductImportRowError {
  rowNumber: number;
  sku: string;
  name: string;
  errors: string[];
}

export interface ProductImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ProductImportRowError[];
}

export interface ProductImportResult extends ProductImportPreview {
  importedRows: number;
}
