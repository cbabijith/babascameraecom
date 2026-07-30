import { describe, expect, it } from "vitest";
import { normalizeProductSlugId } from "./shapes";

describe("product route identifiers", () => {
  it("preserves complete Supabase UUIDs appended to slugs", () => {
    expect(
      normalizeProductSlugId(
        "sony-alpha-7-550e8400-e29b-41d4-a716-446655440000",
      ),
    ).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("preserves legacy Mongo-like identifiers", () => {
    expect(normalizeProductSlugId("sony-camera-68a6b73b848a8513b126c885")).toBe(
      "68a6b73b848a8513b126c885",
    );
  });
});
