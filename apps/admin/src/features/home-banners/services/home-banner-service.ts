import { randomUUID } from "node:crypto";

import sharp from "sharp";

import {
  uploadToS3,
  deleteFromS3,
  deleteManyFromS3,
  extractS3KeyFromUrl,
  getPublicUrlForS3Key,
  getS3ObjectBytes,
} from "@babascamera/db";

import { resolveMediaUrl } from "@/lib/media-proxy";
import {
  bannerReorderSchema,
  homeBannerInputSchema,
} from "../schemas/home-banner-schema";
import {
  createHomeBanner,
  deleteHomeBanner,
  findHomeBanner,
  listHomeBanners,
  reorderHomeBanners,
  updateHomeBanner,
} from "../repositories/home-banner-repository";
import {
  findUnresolvableMedia,
  restoreStoredMediaReferences,
  type BannerMediaReferences,
} from "../utils/media-references";
import type { HomeBanner, HomeBannerInput, UploadedBannerMedia } from "../types";

export const HOME_BANNER_BUCKET = "home-banners";
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 40 * 1024 * 1024;

export class HomeBannerError extends Error {
  constructor(
    message: string,
    readonly code = "HOME_BANNER_OPERATION_FAILED",
    readonly status = 400,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

function serialize(row: Awaited<ReturnType<typeof listHomeBanners>>[number]): HomeBanner {
  return {
    ...row,
    desktopMediaUrl: resolveMediaUrl(row.desktopMediaUrl),
    mobileMediaUrl: resolveMediaUrl(row.mobileMediaUrl),
    posterUrl: resolveMediaUrl(row.posterUrl),
    productIds: (row.productIds as string[]) || [],
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseInput(input: unknown): HomeBannerInput {
  const parsed = homeBannerInputSchema.safeParse(input);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    throw new HomeBannerError(
      flattened.formErrors[0] ?? Object.values(flattened.fieldErrors)[0]?.[0] ?? "Check the banner details.",
      "VALIDATION_FAILED",
      422,
      flattened.fieldErrors as Record<string, string[]>,
    );
  }
  return parsed.data;
}

export async function getHomeBannersForAdmin() {
  return (await listHomeBanners()).map(serialize);
}

export async function createBanner(input: unknown) {
  try {
    const parsed = parseInput(input);
    assertNoUnresolvableMedia(parsed);
    return serialize(await createHomeBanner(parsed));
  } catch (error) {
    if (error instanceof HomeBannerError) throw error;
    if (error instanceof Error && error.message === "BANNER_LIMIT_REACHED") {
      throw new HomeBannerError("Only five homepage banners can be created.", "BANNER_LIMIT_REACHED", 409);
    }
    throw error;
  }
}

export async function updateBanner(id: string, input: unknown) {
  const existing = await findHomeBanner(id);
  if (!existing) throw new HomeBannerError("Banner not found.", "NOT_FOUND", 404);
  // The list API serves media through resolveMediaUrl for display; when a
  // client echoes those display values back, swap them for the raw stored
  // references so proxy paths are never persisted (and never trip
  // removeReplacedMedia into deleting live objects).
  const parsed = restoreStoredMediaReferences(parseInput(input), existing);
  assertNoUnresolvableMedia(parsed);
  const updated = await updateHomeBanner(id, parsed);
  if (!updated) throw new HomeBannerError("Banner not found.", "NOT_FOUND", 404);
  await removeReplacedMedia(existing, updated);
  return serialize(updated);
}

function assertNoUnresolvableMedia(parsed: BannerMediaReferences) {
  const field = findUnresolvableMedia(parsed);
  if (field) {
    throw new HomeBannerError(
      "This media reference is not a stored asset. Re-upload the image or video.",
      "VALIDATION_FAILED",
      422,
      { [field]: ["Re-upload this image or video."] },
    );
  }
}

export async function removeBanner(id: string) {
  const deleted = await deleteHomeBanner(id);
  if (!deleted) throw new HomeBannerError("Banner not found.", "NOT_FOUND", 404);
  await removeMediaUrls([deleted.desktopMediaUrl, deleted.mobileMediaUrl, deleted.posterUrl]);
}

export async function reorderBanners(input: unknown) {
  const parsed = bannerReorderSchema.safeParse(input);
  if (!parsed.success) throw new HomeBannerError("Banner order is invalid.", "VALIDATION_FAILED", 422);
  try {
    await reorderHomeBanners(parsed.data.bannerIds);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BANNER_ORDER_")) {
      throw new HomeBannerError("Refresh the list and try reordering again.", error.message, 409);
    }
    throw error;
  }
}

function webpPath(role: string) {
  return `images/${role}-${randomUUID()}.webp`;
}

export async function processAndUploadImage(file: File, role: string): Promise<UploadedBannerMedia> {
  if (file.size <= 0 || file.size > IMAGE_MAX_BYTES) {
    throw new HomeBannerError("Images must be no larger than 5 MiB.", "IMAGE_TOO_LARGE", 413);
  }
  const source = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  try {
    const metadata = await sharp(source).metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
      throw new Error("unsupported");
    }
    output = await sharp(source)
      .rotate()
      .resize({ width: role === "mobile" ? 1200 : 2400, height: role === "mobile" ? 1500 : 1000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 86, effort: 4 })
      .toBuffer();
  } catch {
    throw new HomeBannerError("Upload a valid JPEG, PNG, or WebP image.", "INVALID_IMAGE", 422);
  }
  const path = webpPath(role);
  const { url } = await uploadToS3({
    key: path,
    body: output,
    contentType: "image/webp",
  });
  return { path, url, contentType: "image/webp" };
}

export async function processAndUploadVideo(file: File, role: "desktop" | "mobile"): Promise<UploadedBannerMedia> {
  if (file.type !== "video/mp4" || file.size <= 0 || file.size > VIDEO_MAX_BYTES) {
    throw new HomeBannerError("Choose an MP4 video no larger than 40 MiB.", "INVALID_VIDEO", 422);
  }
  const path = `videos/${randomUUID()}.mp4`;
  try {
    // Videos upload through the app server (like images) rather than a
    // presigned browser PUT: the admin CSP keeps connect-src 'self', and
    // routing through here avoids depending on bucket CORS configuration.
    await uploadToS3({
      key: path,
      body: Buffer.from(await file.arrayBuffer()),
      contentType: "video/mp4",
    });
    await verifyUploadedVideoCodec(path);
  } catch (error) {
    await deleteFromS3(path).catch(() => null);
    if (error instanceof HomeBannerError) throw error;
    throw new HomeBannerError("Video upload failed. Try again.", "UPLOAD_FAILED", 502);
  }
  return { path, url: getPublicUrlForS3Key(path), contentType: "video/mp4" as const };
}

/** Checks the stored object is a real H.264 MP4 using the app's own S3
    credentials (works on private buckets, no public roundtrip). */
async function verifyUploadedVideoCodec(path: string) {
  try {
    const { bytes } = await getS3ObjectBytes(path, { start: 0, end: 1_048_575 });
    const header = Buffer.from(bytes.subarray(4, 12)).toString("ascii");
    const sample = Buffer.from(bytes).toString("latin1");
    if (!header.includes("ftyp") || !sample.includes("avc1")) {
      throw new HomeBannerError("Video must be an MP4 encoded with H.264.", "INVALID_VIDEO_CODEC", 422);
    }
  } catch (error) {
    if (error instanceof HomeBannerError) throw error;
    throw new HomeBannerError("Uploaded video could not be verified.", "VIDEO_VERIFICATION_FAILED", 422);
  }
}

async function removeMediaUrls(urls: (string | null)[]) {
  const validUrls = urls.filter((u): u is string => Boolean(u));
  if (!validUrls.length) return;

  const s3Keys: string[] = [];

  for (const url of validUrls) {
    const s3Key = extractS3KeyFromUrl(url) || (url.startsWith("banners/") || url.startsWith("images/") ? url : null);
    if (s3Key) {
      s3Keys.push(s3Key);
    }
  }

  if (s3Keys.length) {
    try {
      await deleteManyFromS3(s3Keys);
    } catch (e) {
      console.error("S3 banner cleanup failed:", e);
    }
  }
}

async function removeReplacedMedia(
  previous: Awaited<ReturnType<typeof findHomeBanner>> & object,
  current: Awaited<ReturnType<typeof findHomeBanner>> & object,
) {
  const retained = new Set([current.desktopMediaUrl, current.mobileMediaUrl, current.posterUrl]);
  await removeMediaUrls(
    [previous.desktopMediaUrl, previous.mobileMediaUrl, previous.posterUrl]
      .filter((url) => url && !retained.has(url)),
  );
}
