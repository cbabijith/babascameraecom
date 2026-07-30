import { brandsRoute, parseBrandFormData, successResponse } from "@/features/catalog/api/brands-api-response";
import { brandIdSchema } from "@/features/catalog/schemas/brand";
import { BrandServiceError, deleteBrand, getBrand, updateBrand } from "@/features/catalog/services/brands-service";

interface Context { params: Promise<{ id: string }> }

function parseId(id: string) {
  const parsed = brandIdSchema.safeParse(id);
  if (!parsed.success) throw new BrandServiceError("Brand ID is invalid.", "BRAND_VALIDATION_FAILED", 422);
  return parsed.data;
}

export async function GET(request: Request, context: Context) {
  return brandsRoute(request, async () => {
    const { id } = await context.params;
    return successResponse(await getBrand(parseId(id)));
  });
}

export async function PATCH(request: Request, context: Context) {
  return brandsRoute(request, async () => {
    const { id } = await context.params;
    return successResponse(await updateBrand(parseId(id), await parseBrandFormData(request)));
  });
}

export async function DELETE(request: Request, context: Context) {
  return brandsRoute(request, async () => {
    const { id } = await context.params;
    await deleteBrand(parseId(id));
    return new Response(null, { status: 204 });
  });
}
