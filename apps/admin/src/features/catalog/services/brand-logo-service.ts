import { randomUUID } from "node:crypto";

import sharp from "sharp";

import { detectProductImageMime } from "@/lib/security/product-image";
import { uploadToS3, deleteFromS3, extractS3KeyFromUrl } from "@babascamera/db";

import { BrandServiceError } from "./brands-service-error";

export const BRAND_LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const BRAND_LOGO_MAX_PIXELS = 40_000_000;
const allowedFormats = new Set(["jpeg", "png", "webp"]);

export async function prepareBrandLogo(file: File) {
  if (file.size <= 0 || file.size > BRAND_LOGO_MAX_BYTES) {
    throw new BrandServiceError("Logo must be no larger than 5 MiB.", "BRAND_LOGO_TOO_LARGE", 413);
  }
  const source = Buffer.from(await file.arrayBuffer());
  const detectedMime = detectProductImageMime(source);
  if (!detectedMime || detectedMime !== file.type) {
    throw new BrandServiceError(
      "Logo content does not match its declared JPEG, PNG, or WebP type.",
      "BRAND_LOGO_UNSUPPORTED",
      415,
    );
  }
  let webp: Buffer;
  try {
    const metadata = await sharp(source, { limitInputPixels: BRAND_LOGO_MAX_PIXELS }).metadata();
    if (!allowedFormats.has(metadata.format ?? "") || !metadata.width || !metadata.height) {
      throw new Error("unsupported");
    }
    if (metadata.width * metadata.height > BRAND_LOGO_MAX_PIXELS) throw new Error("dimensions");
    webp = await sharp(source, { limitInputPixels: BRAND_LOGO_MAX_PIXELS })
      .rotate()
      .resize(512, 512, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        withoutEnlargement: true,
      })
      .webp({ quality: 86, effort: 4 })
      .toBuffer();
  } catch {
    throw new BrandServiceError(
      "Upload a valid JPEG, PNG, or WebP logo with supported dimensions.",
      "BRAND_LOGO_UNSUPPORTED",
      415,
    );
  }
  return webp;
}

export async function uploadBrandLogo(brandId: string, file: File) {
  const webp = await prepareBrandLogo(file);
  const path = `brands/${brandId}/${randomUUID()}.webp`;
  const { url } = await uploadToS3({
    key: path,
    body: webp,
    contentType: "image/webp",
  });
  return { path, url };
}

export async function removeManagedBrandLogo(urlOrPath: string | null) {
  if (!urlOrPath) return;
  const s3Key = extractS3KeyFromUrl(urlOrPath);
  if (s3Key) {
    try {
      await deleteFromS3(s3Key);
    } catch (e) {
      console.error("S3 brand logo cleanup failed:", e);
    }
  }
}
