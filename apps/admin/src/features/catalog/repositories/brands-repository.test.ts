import { describe, expect, it } from "bun:test";

import { isCompleteBrandOrder } from "./brands-repository";

describe("isCompleteBrandOrder", () => {
  const existing = ["canon", "sony", "nikon"];

  it("accepts the complete set in a different order", () => {
    expect(isCompleteBrandOrder(existing, ["nikon", "canon", "sony"])).toBe(true);
  });

  it("rejects duplicate, missing, and unknown IDs", () => {
    expect(isCompleteBrandOrder(existing, ["canon", "canon", "nikon"])).toBe(false);
    expect(isCompleteBrandOrder(existing, ["canon", "sony"])).toBe(false);
    expect(isCompleteBrandOrder(existing, ["canon", "sony", "fuji"])).toBe(false);
  });
});
