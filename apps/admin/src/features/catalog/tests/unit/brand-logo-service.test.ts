import { describe, expect, test } from "bun:test";
import sharp from "sharp";

import { BrandServiceError } from "@/features/catalog/services/brands-service-error";
import {
  BRAND_LOGO_MAX_BYTES,
  prepareBrandLogo,
} from "@/features/catalog/services/brand-logo-service";

describe("brand logo processing", () => {
  test("converts a valid transparent PNG to a bounded WebP", async () => {
    const png = await sharp({
      create: { width: 32, height: 24, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } },
    }).png().withMetadata({ orientation: 6 }).toBuffer();
    const output = await prepareBrandLogo(new File([Uint8Array.from(png)], "logo.png", { type: "image/png" }));
    const metadata = await sharp(output).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(512);
    expect(metadata.height).toBeLessThanOrEqual(512);
  });

  test("rejects MIME spoofing and unsupported image content", async () => {
    const fake = new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "fake.png", { type: "image/png" });
    await expect(prepareBrandLogo(fake)).rejects.toBeInstanceOf(BrandServiceError);
  });

  test("rejects oversized source files before decoding", async () => {
    const oversized = new File([new Uint8Array(BRAND_LOGO_MAX_BYTES + 1)], "large.png", { type: "image/png" });
    await expect(prepareBrandLogo(oversized)).rejects.toMatchObject({ code: "BRAND_LOGO_TOO_LARGE", status: 413 });
  });
});
