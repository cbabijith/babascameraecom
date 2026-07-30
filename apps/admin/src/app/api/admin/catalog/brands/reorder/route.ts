import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { reorderBrands } from "@/features/catalog/services/brands-service";

export async function POST(request: Request) {
  return catalogRoute(request, async () =>
    actionResultResponse(await reorderBrands(await request.formData())),
  );
}
