import { describe, expect, it } from "bun:test";

import {
  detectProductImageMime,
  randomizedProductImagePath,
  validateProductImage,
} from "./product-image";

const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("product image validation", () => {
  it("detects supported signatures", () => {
    expect(detectProductImageMime(pngBytes)).toBe("image/png");
    expect(
      detectProductImageMime(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBe("image/webp");
    expect(detectProductImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      "image/jpeg",
    );
  });

  it("rejects a spoofed MIME type", async () => {
    const spoofed = new File([pngBytes], "camera.jpg", { type: "image/jpeg" });
    await expect(validateProductImage(spoofed)).rejects.toThrow("does not match");
  });

  it("uses opaque paths and never includes the original filename", () => {
    const path = randomizedProductImagePath("product-id", "png");
    expect(path).toMatch(/^product-id\/[0-9a-f-]{36}\.png$/);
    expect(path).not.toContain("camera");
  });
});
