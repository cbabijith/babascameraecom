import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { saveBrand } from "@/features/catalog/services/brands-service";
import { getBrands } from "@/features/catalog/server/readers";

export async function GET(request: Request) {
  return catalogRoute(request, async () =>
    Response.json({ success: true, data: await getBrands() }),
  );
}

export async function POST(request: Request) {
  return catalogRoute(request, async () =>
    actionResultResponse(await saveBrand(await request.formData()), { created: true }),
  );
}
