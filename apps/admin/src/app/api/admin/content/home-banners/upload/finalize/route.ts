import {
  finalizeVideoUpload,
} from "@/features/home-banners/services/home-banner-service";
import {
  homeBannerRoute,
  successResponse,
} from "@/features/home-banners/api/route-guard";

export async function POST(request: Request) {
  return homeBannerRoute(request, async () =>
    successResponse(await finalizeVideoUpload(await request.json()), 201));
}
