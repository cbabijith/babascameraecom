import { bannerIdSchema } from "@/features/home-banners/schemas/home-banner-schema";
import {
  removeBanner,
  updateBanner,
  HomeBannerError,
} from "@/features/home-banners/services/home-banner-service";
import {
  homeBannerRoute,
  successResponse,
} from "@/features/home-banners/api/route-guard";

function parseId(id: string) {
  const parsed = bannerIdSchema.safeParse(id);
  if (!parsed.success) throw new HomeBannerError("Banner ID is invalid.", "VALIDATION_FAILED", 422);
  return parsed.data;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return homeBannerRoute(request, async () => {
    const { id } = await context.params;
    return successResponse(await updateBanner(parseId(id), await request.json()));
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return homeBannerRoute(request, async () => {
    const { id } = await context.params;
    await removeBanner(parseId(id));
    return new Response(null, { status: 204 });
  });
}
