import { describe, expect, test } from "bun:test";

import {
  bannerReorderSchema,
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

  test("accepts root-relative proxy media paths served by the API itself", () => {
    const result = homeBannerInputSchema.safeParse({
      ...validImage,
      desktopMediaUrl: "/api/media/images/desktop-c8521015.webp",
      mobileMediaUrl: "/api/media/images/mobile-c8521015.webp",
    });
    expect(result.success).toBe(true);
  });

  test("rejects protocol-relative and non-http media references", () => {
    for (const desktopMediaUrl of ["//evil.example.com/desktop.webp", "javascript:alert(1)", "images/desktop.webp"]) {
      const result = homeBannerInputSchema.safeParse({ ...validImage, desktopMediaUrl });
      expect(result.success).toBe(false);
    }
  });

  test("requires mobile media for image banners", () => {
    const result = homeBannerInputSchema.safeParse({ ...validImage, mobileMediaUrl: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.mobileMediaUrl?.[0]).toContain("mobile image");
    }
  });

  test("allows shared-media image banners without a mobile asset", () => {
    const result = homeBannerInputSchema.safeParse({
      ...validImage,
      mobileMediaUrl: null,
      sameMedia: true,
    });
    expect(result.success).toBe(true);
  });

  test("defaults sameMedia to false for legacy payloads", () => {
    const result = homeBannerInputSchema.safeParse(validImage);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sameMedia).toBe(false);
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

  test("tells the user which asset is missing instead of a format error", () => {
    const imageResult = homeBannerInputSchema.safeParse({ ...validImage, desktopMediaUrl: "" });
    expect(imageResult.success).toBe(false);
    if (!imageResult.success) {
      expect(imageResult.error.flatten().fieldErrors.desktopMediaUrl?.[0]).toContain("image");
    }

    const videoResult = homeBannerInputSchema.safeParse({
      ...validImage,
      mediaType: "video",
      desktopMediaUrl: "",
      posterUrl: "https://example.com/poster.webp",
    });
    expect(videoResult.success).toBe(false);
    if (!videoResult.success) {
      expect(videoResult.error.flatten().fieldErrors.desktopMediaUrl?.[0]).toContain("video");
    }
  });

  test("requires a complete unique reorder list shape", () => {
    const id = "6f0f33fb-6125-4f90-86aa-8c33df73ff88";
    expect(bannerReorderSchema.safeParse({ bannerIds: [id] }).success).toBe(true);
    expect(bannerReorderSchema.safeParse({ bannerIds: [] }).success).toBe(false);
    expect(bannerReorderSchema.safeParse({ bannerIds: Array(6).fill(id) }).success).toBe(false);
  });
});
