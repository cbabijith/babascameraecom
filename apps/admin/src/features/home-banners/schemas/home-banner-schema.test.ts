import { describe, expect, test } from "bun:test";

import {
  bannerFinalizeSchema,
  bannerReorderSchema,
  bannerVideoUploadSchema,
  homeBannerInputSchema,
} from "./home-banner-schema";

const validImage = {
  internalName: "Summer cameras",
  mediaType: "image",
  desktopMediaUrl: "https://example.com/desktop.webp",
  mobileMediaUrl: "https://example.com/mobile.webp",
  posterUrl: null,
  altText: "A camera promotion",
  headline: null,
  subheading: null,
  buttonLabel: null,
  destinationUrl: "/products",
  openInNewTab: false,
  isActive: true,
  startsAt: null,
  endsAt: null,
};

describe("homepage banner validation", () => {
  test("accepts a responsive image banner", () => {
    expect(homeBannerInputSchema.safeParse(validImage).success).toBe(true);
  });

  test("requires mobile media for image banners", () => {
    const result = homeBannerInputSchema.safeParse({ ...validImage, mobileMediaUrl: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.mobileMediaUrl?.[0]).toContain("mobile image");
    }
  });

  test("requires a poster for videos", () => {
    const result = homeBannerInputSchema.safeParse({
      ...validImage,
      mediaType: "video",
      mobileMediaUrl: null,
      posterUrl: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.posterUrl?.[0]).toContain("poster");
    }
  });

  test("rejects an invalid schedule and unsafe destination", () => {
    const result = homeBannerInputSchema.safeParse({
      ...validImage,
      destinationUrl: "javascript:alert(1)",
      startsAt: "2026-08-02T10:00:00.000Z",
      endsAt: "2026-08-01T10:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  test("requires a complete unique reorder list shape", () => {
    const id = "6f0f33fb-6125-4f90-86aa-8c33df73ff88";
    expect(bannerReorderSchema.safeParse({ bannerIds: [id] }).success).toBe(true);
    expect(bannerReorderSchema.safeParse({ bannerIds: [] }).success).toBe(false);
    expect(bannerReorderSchema.safeParse({ bannerIds: Array(6).fill(id) }).success).toBe(false);
  });

  test("enforces the video upload contract", () => {
    expect(bannerVideoUploadSchema.safeParse({
      fileName: "hero.mp4",
      size: 40 * 1024 * 1024,
      contentType: "video/mp4",
    }).success).toBe(true);
    expect(bannerVideoUploadSchema.safeParse({
      fileName: "hero.mov",
      size: 40 * 1024 * 1024 + 1,
      contentType: "video/quicktime",
    }).success).toBe(false);
    expect(bannerFinalizeSchema.safeParse({
      path: "videos/6f0f33fb-6125-4f90-86aa-8c33df73ff88.mp4",
      size: 1024,
    }).success).toBe(true);
  });
});
