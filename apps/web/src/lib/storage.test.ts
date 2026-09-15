import { describe, expect, it } from "vitest";

import { productImageUrl } from "./storage";

describe("productImageUrl", () => {
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
        "https://arranged-pantry-yko9l8ktd.t3.storageapi.dev/products/x.webp",
      ),
    ).toBe("/api/media/products/x.webp");
  });

  it("maps null and undefined to the placeholder", () => {
    expect(productImageUrl(null)).toBe("/placeholder.svg");
    expect(productImageUrl(undefined)).toBe("/placeholder.svg");
  });
});
