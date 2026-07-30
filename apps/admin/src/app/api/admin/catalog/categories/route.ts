import { actionResultResponse } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { saveCategory } from "@/features/catalog/services/categories-service";
import { getCategories } from "@/features/catalog/server/readers";

export async function GET(request: Request) {
  return catalogRoute(request, async () =>
    Response.json({ success: true, data: await getCategories() }),
  );
}

export async function POST(request: Request) {
  return catalogRoute(request, async () => {
    const formData = await request.formData();
    return actionResultResponse(await saveCategory(formData), { created: true });
  });
}
