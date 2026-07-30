import { buildProductExportWorkbook } from "@/features/catalog/services/product-import-service";
import { normalizeProductListQuery } from "@/features/catalog/types";
import { catalogRoute } from "@/features/catalog/api/route-guard";

export async function GET(request: Request) {
  return catalogRoute(request, async () => {
    const params = new URL(request.url).searchParams;
    const query = normalizeProductListQuery({
      q: params.get("q") ?? undefined,
      status: params.get("status") ?? undefined,
      category: params.get("category") ?? undefined,
      brand: params.get("brand") ?? undefined,
      inventory: params.get("inventory") ?? undefined,
      sort: params.get("sort") ?? undefined,
      order: params.get("order") ?? undefined,
      page: params.get("page") ?? undefined,
      pageSize: params.get("pageSize") ?? undefined,
    });
    const buffer = await buildProductExportWorkbook(query);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="products-export.xlsx"',
      },
    });
  });
}
