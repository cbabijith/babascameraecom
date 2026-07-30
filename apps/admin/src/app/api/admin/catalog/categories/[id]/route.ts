import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import {
  deleteCategory,
  saveCategory,
  setCategoryActive,
} from "@/features/catalog/services/categories-service";

interface Context { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  return catalogRoute(request, async () => {
    const { id } = await context.params;
    const formData = await request.formData();
    formData.set("id", id);
    const result = formData.has("name")
      ? await saveCategory(formData)
      : await setCategoryActive(formData);
    return actionResultResponse(result);
  });
}

export async function DELETE(request: Request, context: Context) {
  return catalogRoute(request, async () => {
    const { id } = await context.params;
    const formData = new FormData();
    formData.set("id", id);
    return actionResultResponse(await deleteCategory(formData), { empty: true });
  });
}
