import { describe, expect, it } from "vitest";

import { safeDestinationUrl, safePublicMediaReference } from "./public-urls";

describe("storefront public URLs", () => {
  it("allows safe relative and HTTP(S) destinations", () => {
    expect(safeDestinationUrl("/products?sort=newest")).toBe("/products?sort=newest");
    expect(safeDestinationUrl("https://example.com/offer")).toBe("https://example.com/offer");
  });

  it("rejects executable, protocol-relative, and malformed destinations", () => {
    expect(safeDestinationUrl("javascript:alert(1)")).toBeNull();
    expect(safeDestinationUrl("//evil.example/path")).toBeNull();
    expect(safeDestinationUrl("/safe\\redirect")).toBeNull();
  });

  it("allows storage object keys but rejects unapproved remote media", () => {
    expect(safePublicMediaReference("catalog/camera.webp")).toBe("catalog/camera.webp");
    expect(safePublicMediaReference("http://example.com/camera.webp")).toBeNull();
    expect(safePublicMediaReference("https://example.com/camera.webp")).toBeNull();
  });
});
