import {
  HomeBannerError,
  processAndUploadImage,
  processAndUploadVideo,
} from "@/features/home-banners/services/home-banner-service";
import {
  homeBannerRoute,
  successResponse,
} from "@/features/home-banners/api/route-guard";

export const maxDuration = 300;

export async function POST(request: Request) {
  return homeBannerRoute(request, async () => {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new HomeBannerError("Uploads must be multipart form data.", "VALIDATION_FAILED", 422);
    }
    const form = await request.formData();
    const file = form.get("file");
    const role = String(form.get("role") ?? "");
    if (!(file instanceof File)) {
      throw new HomeBannerError("Upload is invalid.", "VALIDATION_FAILED", 422);
    }
    if (file.type === "video/mp4") {
      if (role !== "desktop" && role !== "mobile") {
        throw new HomeBannerError("Video role must be desktop or mobile.", "VALIDATION_FAILED", 422);
      }
      return successResponse(await processAndUploadVideo(file, role), 201);
    }
    if (!["desktop", "mobile", "poster"].includes(role)) {
      throw new HomeBannerError("Image upload is invalid.", "VALIDATION_FAILED", 422);
    }
    return successResponse(await processAndUploadImage(file, role), 201);
  });
}
