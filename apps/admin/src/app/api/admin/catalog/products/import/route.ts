import { revalidatePath } from "next/cache";

import { catalogApiError } from "@/features/catalog/api/api-error";
import { catalogRoute } from "@/features/catalog/api/route-guard";
import { importProductExcelFile } from "@/features/catalog/services/product-import-service";

export async function POST(request: Request) {
  return catalogRoute(request, async () => {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return catalogApiError("FILE_REQUIRED", "Choose an .xlsx file.", 422);
    }
    const result = await importProductExcelFile(file);
    if (result.invalidRows > 0) {
      return Response.json({
        success: false,
        error: {
          code: "IMPORT_VALIDATION_FAILED",
          message: "Some workbook rows are invalid.",
          fieldErrors: {
            rows: result.errors.flatMap((item) =>
              item.errors.map((message) => `Row ${item.rowNumber}: ${message}`),
            ),
          },
        },
      }, { status: 422 });
    }
    revalidatePath("/products");
    return Response.json({ success: true, data: result });
  });
}
