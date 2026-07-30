import { randomUUID } from "node:crypto";

import sharp from "sharp";

import { createClient } from "@/lib/supabase/server";

import {
  bannerFinalizeSchema,
  bannerReorderSchema,
  bannerVideoUploadSchema,
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
    return serialize(await createHomeBanner(parseInput(input)));
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
  const parsed = parseInput(input);
  const updated = await updateHomeBanner(id, parsed);
  if (!updated) throw new HomeBannerError("Banner not found.", "NOT_FOUND", 404);
  await removeReplacedMedia(existing, updated);
  return serialize(updated);
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
  const supabase = await createClient();
  const { error } = await supabase.storage.from(HOME_BANNER_BUCKET)
    .upload(path, output, { contentType: "image/webp", upsert: false });
  if (error) throw new HomeBannerError("Image upload failed. Check banner storage configuration.", "UPLOAD_FAILED", 502);
  const { data } = supabase.storage.from(HOME_BANNER_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl, contentType: "image/webp" };
}

export async function authorizeVideoUpload(input: unknown) {
  const parsed = bannerVideoUploadSchema.safeParse(input);
  if (!parsed.success) throw new HomeBannerError("Choose an MP4 video no larger than 40 MiB.", "INVALID_VIDEO", 422);
  const path = `videos/${randomUUID()}.mp4`;
  const { data, error } = await (await createClient()).storage
    .from(HOME_BANNER_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) throw new HomeBannerError("Video upload could not be authorized.", "UPLOAD_FAILED", 502);
  return { path, token: data.token, contentType: "video/mp4" as const, maximumBytes: VIDEO_MAX_BYTES };
}

export async function finalizeVideoUpload(input: unknown): Promise<UploadedBannerMedia> {
  const parsed = bannerFinalizeSchema.safeParse(input);
  if (!parsed.success) throw new HomeBannerError("Uploaded video details are invalid.", "INVALID_VIDEO", 422);
  const supabase = await createClient();
  const { data } = supabase.storage.from(HOME_BANNER_BUCKET).getPublicUrl(parsed.data.path);
  try {
    const response = await fetch(data.publicUrl, { headers: { Range: "bytes=0-1048575" }, cache: "no-store" });
    if (!response.ok) throw new Error("missing");
    const bytes = Buffer.from(await response.arrayBuffer());
    const header = bytes.subarray(4, 12).toString("ascii");
    const sample = bytes.toString("latin1");
    if (!header.includes("ftyp") || !sample.includes("avc1")) {
      await supabase.storage.from(HOME_BANNER_BUCKET).remove([parsed.data.path]);
      throw new HomeBannerError("Video must be an MP4 encoded with H.264.", "INVALID_VIDEO_CODEC", 422);
    }
  } catch (error) {
    if (error instanceof HomeBannerError) throw error;
    throw new HomeBannerError("Uploaded video could not be verified.", "VIDEO_VERIFICATION_FAILED", 422);
  }
  return { path: parsed.data.path, url: data.publicUrl, contentType: "video/mp4" };
}

function storagePath(url: string | null) {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${HOME_BANNER_BUCKET}/`;
  try {
    const parsed = new URL(url);
    const index = parsed.pathname.indexOf(marker);
    return index >= 0 ? decodeURIComponent(parsed.pathname.slice(index + marker.length)) : null;
  } catch {
    return null;
  }
}

async function removeMediaUrls(urls: (string | null)[]) {
  const paths = [...new Set(urls.map(storagePath).filter((path): path is string => Boolean(path)))];
  if (!paths.length) return;
  const { error } = await (await createClient()).storage.from(HOME_BANNER_BUCKET).remove(paths);
  if (error) console.error("Banner media cleanup failed.", { paths, error });
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
