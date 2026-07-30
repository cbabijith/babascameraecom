import { buildProductSampleWorkbook } from "@/features/catalog/services/product-import-service";
import { catalogRoute } from "@/features/catalog/api/route-guard";

export async function GET(request: Request) {
  return catalogRoute(request, async () => {
    const buffer = await buildProductSampleWorkbook();
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="product-import-sample.xlsx"',
      },
    });
  });
}
