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

  it("falls back to the placeholder for unresolved object keys", () => {
    expect(productImageUrl("products/camera body.webp")).toBe("/placeholder.svg");
  });

  it("maps null and undefined to the placeholder", () => {
    expect(productImageUrl(null)).toBe("/placeholder.svg");
    expect(productImageUrl(undefined)).toBe("/placeholder.svg");
  });
});
