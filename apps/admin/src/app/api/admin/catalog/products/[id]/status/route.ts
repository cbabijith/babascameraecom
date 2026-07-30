import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { setProductActive } from "@/features/catalog/services/products-service";

interface Context { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  return catalogRoute(request, async () => {
    const { id } = await context.params;
    const formData = await request.formData();
    formData.set("id", id);
    return actionResultResponse(await setProductActive(formData));
  });
}
