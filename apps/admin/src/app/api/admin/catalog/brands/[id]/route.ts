import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { deleteBrand, saveBrand } from "@/features/catalog/services/brands-service";

interface Context { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  return catalogRoute(request, async () => {
    const { id } = await context.params;
    const formData = await request.formData();
    formData.set("id", id);
    return actionResultResponse(await saveBrand(formData));
  });
}

export async function DELETE(request: Request, context: Context) {
  return catalogRoute(request, async () => {
    const { id } = await context.params;
    const formData = new FormData();
    formData.set("id", id);
    return actionResultResponse(await deleteBrand(formData), { empty: true });
  });
}
