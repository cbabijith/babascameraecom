import { randomUUID } from "node:crypto";

import sharp from "sharp";

import {
  detectProductImageMime,
  PRODUCT_IMAGE_BUCKET,
  storagePathFromPublicUrl,
} from "@/lib/security/product-image";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET)
    .upload(path, webp, { contentType: "image/webp", upsert: false });
  if (error) throw new BrandServiceError("Brand logo upload failed.", "BRAND_LOGO_UPLOAD_FAILED", 500);
  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function removeManagedBrandLogo(urlOrPath: string | null) {
  if (!urlOrPath) return;
  const path = urlOrPath.startsWith("brands/") ? urlOrPath : storagePathFromPublicUrl(urlOrPath);
  if (!path || !path.startsWith("brands/")) return;
  const { error } = await (await createClient()).storage.from(PRODUCT_IMAGE_BUCKET).remove([path]);
  if (error) console.error("Brand logo cleanup failed.", { path, message: error.message });
}
