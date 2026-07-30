import { BrandServiceError } from "@/features/catalog/services/brands-service";
import { brandsRoute, parseBrandFormData, successResponse } from "@/features/catalog/api/brands-api-response";
import { createBrand, getBrands } from "@/features/catalog/services/brands-service";

export async function GET(request: Request) {
  return brandsRoute(request, async () => {
    const url = new URL(request.url);
    for (const key of url.searchParams.keys()) {
      if (key !== "q" && key !== "status") {
        throw new BrandServiceError("Brand query contains unsupported fields.", "BRAND_VALIDATION_FAILED", 422);
      }
    }
    return successResponse(await getBrands({
      q: url.searchParams.get("q") ?? "",
      status: url.searchParams.get("status") ?? "all",
    }));
  });
}

export async function POST(request: Request) {
  return brandsRoute(request, async () =>
    successResponse(await createBrand(await parseBrandFormData(request)), 201));
}
