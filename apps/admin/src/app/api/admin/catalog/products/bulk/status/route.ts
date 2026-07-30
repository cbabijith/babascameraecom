import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { bulkSetProductsActive } from "@/features/catalog/services/products-service";

export async function PATCH(request: Request) {
  return catalogRoute(request, async () =>
    actionResultResponse(await bulkSetProductsActive(await request.formData())),
  );
}
