import { describe, expect, test } from "bun:test";

import {
  PRODUCT_IMAGE_MAX_BYTES,
  detectProductImageMime,
  randomizedProductImagePath,
  validateProductImage,
} from "@/lib/security/product-image";

describe("product image contract", () => {
  test("detects the three allowed formats by magic bytes", () => {
    expect(detectProductImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(detectProductImageMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(detectProductImageMime(new TextEncoder().encode("RIFF0000WEBP"))).toBe("image/webp");
  });

  test("rejects MIME spoofing and AVIF", async () => {
    const spoofed = new File([Uint8Array.from([0xff, 0xd8, 0xff])], "fake.png", { type: "image/png" });
    await expect(validateProductImage(spoofed)).rejects.toThrow("does not match");
    const avif = new File([new TextEncoder().encode("0000ftypavif")], "photo.avif", { type: "image/avif" });
    await expect(validateProductImage(avif)).rejects.toThrow("JPEG, PNG, or WebP");
  });

  test("rejects oversized files and creates non-guessable product paths", async () => {
    const oversized = new File([new Uint8Array(PRODUCT_IMAGE_MAX_BYTES + 1)], "large.jpg", { type: "image/jpeg" });
    await expect(validateProductImage(oversized)).rejects.toThrow("5 MiB");
    const first = randomizedProductImagePath("product-id", "jpg");
    const second = randomizedProductImagePath("product-id", "jpg");
    expect(first).not.toBe(second);
    expect(first).toMatch(/^product-id\/[0-9a-f-]{36}\.jpg$/);
  });
});
