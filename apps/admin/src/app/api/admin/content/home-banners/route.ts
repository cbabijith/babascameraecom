import {
  createBanner,
  getHomeBannersForAdmin,
} from "@/features/home-banners/services/home-banner-service";
import {
  homeBannerRoute,
  successResponse,
} from "@/features/home-banners/api/route-guard";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return homeBannerRoute(request, async () => successResponse(await getHomeBannersForAdmin()));
}

export async function POST(request: Request) {
  return homeBannerRoute(request, async () => successResponse(await createBanner(await request.json()), 201));
}
