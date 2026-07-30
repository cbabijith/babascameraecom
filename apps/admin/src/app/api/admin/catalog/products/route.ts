import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { saveProduct } from "@/features/catalog/services/products-service";
import { getProductCatalogPage } from "@/features/catalog/server/readers";
import { normalizeProductListQuery } from "@/features/catalog/types";

export async function GET(request: Request) {
  return catalogRoute(request, async () => {
    const params = new URL(request.url).searchParams;
    const query = normalizeProductListQuery(Object.fromEntries(params));
    return Response.json({ success: true, data: await getProductCatalogPage(query) });
  });
}

export async function POST(request: Request) {
  return catalogRoute(request, async () =>
    actionResultResponse(await saveProduct(await request.formData()), { created: true }),
  );
}
