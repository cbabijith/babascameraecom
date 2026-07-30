import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { bulkDeleteProducts } from "@/features/catalog/services/products-service";

export async function POST(request: Request) {
  return catalogRoute(request, async () =>
    actionResultResponse(await bulkDeleteProducts(await request.formData())),
  );
}
