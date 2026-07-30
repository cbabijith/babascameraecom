import { validateProductImportFile } from "@/features/catalog/services/product-import-service";
import { catalogApiError } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";

export async function POST(request: Request) {
  return catalogRoute(request, async () => {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return catalogApiError("FILE_REQUIRED", "Choose an .xlsx file.", 422);
    }
    return Response.json({ success: true, data: await validateProductImportFile(file) });
  });
}
