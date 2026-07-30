import { brandsRoute, parseBrandJson } from "@/features/catalog/api/brands-api-response";
import { reorderBrands } from "@/features/catalog/services/brands-service";

export async function POST(request: Request) {
  return brandsRoute(request, async () => {
    await reorderBrands(await parseBrandJson(request));
    return new Response(null, { status: 204 });
  });
}
