import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { deleteProduct, saveProduct } from "@/features/catalog/services/products-service";
import { getProduct } from "@/features/catalog/server/readers";

interface Context { params: Promise<{ id: string }> }

export async function GET(request: Request, context: Context) {
  return catalogRoute(request, async () => {
    const { id } = await context.params;
    const product = await getProduct(id);
    if (!product) {
      return Response.json({
        success: false,
        error: { code: "PRODUCT_NOT_FOUND", message: "Product was not found." },
      }, { status: 404 });
    }
    return Response.json({ success: true, data: product });
  });
}

export async function PATCH(request: Request, context: Context) {
  return catalogRoute(request, async () => {
    const { id } = await context.params;
    const formData = await request.formData();
    formData.set("id", id);
    return actionResultResponse(await saveProduct(formData));
  });
}

export async function DELETE(request: Request, context: Context) {
  return catalogRoute(request, async () => {
    const { id } = await context.params;
    const formData = new FormData();
    formData.set("id", id);
    return actionResultResponse(await deleteProduct(formData), { empty: true });
  });
}
