import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { setPrimaryProductImage } from "@/features/catalog/services/product-images-service";

interface Context { params: Promise<{ id: string; imageId: string }> }

export async function PATCH(request: Request, context: Context) {
  return catalogRoute(request, async () => {
    const { id, imageId } = await context.params;
    const formData = new FormData();
    formData.set("productId", id);
    formData.set("imageId", imageId);
    return actionResultResponse(await setPrimaryProductImage(formData));
  });
}
