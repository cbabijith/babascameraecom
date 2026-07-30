import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { reorderProductImages } from "@/features/catalog/services/product-images-service";

interface Context { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Context) {
  return catalogRoute(request, async () => {
    const { id } = await context.params;
    const formData = await request.formData();
    formData.set("productId", id);
    return actionResultResponse(await reorderProductImages(formData));
  });
}
