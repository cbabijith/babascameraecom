import { describe, expect, it } from "vitest";
import { safeRelativePath } from "./safe-redirect";

describe("safeRelativePath", () => {
  it("preserves same-origin relative destinations", () => {
    expect(safeRelativePath("/orders/123?tab=invoice#top")).toBe(
      "/orders/123?tab=invoice#top",
    );
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/%2F%2Fevil.example/steal",
    "/\\evil.example",
    "javascript:alert(1)",
  ])("rejects unsafe redirect %s", (value) => {
    expect(safeRelativePath(value)).toBe("/");
  });
});
