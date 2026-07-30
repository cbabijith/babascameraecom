import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { reorderCategories } from "@/features/catalog/services/categories-service";

export async function POST(request: Request) {
  return catalogRoute(request, async () =>
    actionResultResponse(await reorderCategories(await request.formData())),
  );
}
