import { AdminPage, AdminPageHeader, AdminSection } from "@/components/ui/admin-page";
import { ProductImportExportPanel } from "@/features/catalog/components/product-import-export-panel";
import { ProductTable } from "@/features/catalog/components/product-table";
import { getCatalogOptions, getProductCatalogPage } from "@/features/catalog/server/products";
import { buildProductListParams, normalizeProductListQuery } from "@/features/catalog/types";

interface SearchParams {
  q?: string;
  status?: "all" | "active" | "inactive" | "low-stock";
  category?: string;
  brand?: string;
  inventory?: "all" | "in-stock" | "low-stock" | "out-of-stock";
  sort?: string;
  order?: "asc" | "desc";
  page?: string;
  pageSize?: string;
}

export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = await searchParams;
  const normalized = normalizeProductListQuery({
    q: query.q,
    status: query.status,
    category: query.category,
    brand: query.brand,
    inventory: query.inventory,
    sort: query.sort,
    order: query.order,
    page: query.page,
    pageSize: query.pageSize,
  });
  const [options, data] = await Promise.all([
    getCatalogOptions(),
    getProductCatalogPage(normalized),
  ]);
  const exportQuery = buildProductListParams(normalized).toString();

  return (
    <AdminPage className="min-w-0">
      <AdminPageHeader
        title="Products"
        description="Manage products, pricing, and inventory."
        primaryAction={{ href: "/products/new", label: "Add product" }}
        secondaryActions={(
          <ProductImportExportPanel
            exportHref={`/api/admin/catalog/products/export${exportQuery ? `?${exportQuery}` : ""}`}
            iconOnly
          />
        )}
      />
      <AdminSection className="min-w-0 overflow-hidden border-0 bg-transparent">
        <ProductTable data={data} categories={options.categories} brands={options.brands} query={normalized} />
      </AdminSection>
    </AdminPage>
  );
}
