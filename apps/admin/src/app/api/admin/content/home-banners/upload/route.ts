import {
  authorizeVideoUpload,
  HomeBannerError,
  processAndUploadImage,
} from "@/features/home-banners/services/home-banner-service";
import {
  homeBannerRoute,
  successResponse,
} from "@/features/home-banners/api/route-guard";

export async function POST(request: Request) {
  return homeBannerRoute(request, async () => {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const role = String(form.get("role") ?? "");
      if (!(file instanceof File) || !["desktop", "mobile", "poster"].includes(role)) {
        throw new HomeBannerError("Image upload is invalid.", "VALIDATION_FAILED", 422);
      }
      return successResponse(await processAndUploadImage(file, role), 201);
    }
    return successResponse(await authorizeVideoUpload(await request.json()));
  });
}
