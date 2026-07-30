import { homeBannerRoute } from "@/features/home-banners/api/route-guard";
import { reorderBanners } from "@/features/home-banners/services/home-banner-service";

export async function POST(request: Request) {
  return homeBannerRoute(request, async () => {
    await reorderBanners(await request.json());
    return new Response(null, { status: 204 });
  });
}
