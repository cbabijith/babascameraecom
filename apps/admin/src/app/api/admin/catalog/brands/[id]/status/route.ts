import { brandsRoute, parseBrandJson, successResponse } from "@/features/catalog/api/brands-api-response";
import { brandIdSchema } from "@/features/catalog/schemas/brand";
import { BrandServiceError, setBrandStatus } from "@/features/catalog/services/brands-service";

interface Context { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  return brandsRoute(request, async () => {
    const { id } = await context.params;
    const parsed = brandIdSchema.safeParse(id);
    if (!parsed.success) throw new BrandServiceError("Brand ID is invalid.", "BRAND_VALIDATION_FAILED", 422);
    return successResponse(await setBrandStatus(parsed.data, await parseBrandJson(request)));
  });
}
