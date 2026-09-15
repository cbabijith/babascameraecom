import { afterEach, describe, expect, it } from "vitest";

import { productImageUrl } from "./storage";

const DIRECT_BASE = "https://media-bucket.t3.storageapi.dev";

function enableDirectMode() {
  process.env.NEXT_PUBLIC_MEDIA_MODE = "direct";
  process.env.NEXT_PUBLIC_S3_PUBLIC_URL = DIRECT_BASE;
}

describe("productImageUrl", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_MEDIA_MODE;
    delete process.env.NEXT_PUBLIC_S3_PUBLIC_URL;
  });

  it("keeps local public assets local", () => {
    expect(productImageUrl("/camera2.png")).toBe("/camera2.png");
  });

  it("keeps absolute URLs unchanged", () => {
    expect(productImageUrl("https://images.example/camera.webp")).toBe(
      "https://images.example/camera.webp",
    );
  });

  it("routes bare object keys through the media proxy", () => {
    expect(productImageUrl("products/camera body.webp")).toBe(
      "/api/media/products/camera%20body.webp",
    );
  });

  it("routes legacy Tigris URLs through the media proxy", () => {
    expect(
      productImageUrl(
        "https://legacy-bucket.t3.storageapi.dev/products/x.webp",
      ),
    ).toBe("/api/media/products/x.webp");
  });

  it("maps null and undefined to the placeholder", () => {
    expect(productImageUrl(null)).toBe("/placeholder.svg");
    expect(productImageUrl(undefined)).toBe("/placeholder.svg");
  });

  describe("direct media mode", () => {
    it("rewrites Tigris URLs to the public CDN base", () => {
      enableDirectMode();
      expect(
        productImageUrl("https://legacy-bucket.t3.storageapi.dev/products/x.webp"),
      ).toBe(`${DIRECT_BASE}/products/x.webp`);
    });

    it("rewrites legacy proxy URLs to the public CDN base", () => {
      enableDirectMode();
      expect(
        productImageUrl("https://admin.example.com/api/media/products/x.webp"),
      ).toBe(`${DIRECT_BASE}/products/x.webp`);
    });

    it("leaves URLs already on the CDN untouched", () => {
      enableDirectMode();
      expect(productImageUrl(`${DIRECT_BASE}/products/x.webp`)).toBe(
        `${DIRECT_BASE}/products/x.webp`,
      );
    });
  });
});
