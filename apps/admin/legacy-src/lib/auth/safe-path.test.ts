import { describe, expect, it } from "bun:test";

import { safeReturnPath } from "./safe-path";

describe("admin return paths", () => {
  it("keeps ordinary local paths and queries", () => {
    expect(safeReturnPath("/orders/123?tab=payment")).toBe(
      "/orders/123?tab=payment",
    );
  });

  it("rejects absolute, protocol-relative, and backslash redirects", () => {
    expect(safeReturnPath("https://evil.example")).toBe("/");
    expect(safeReturnPath("//evil.example")).toBe("/");
    expect(safeReturnPath("/\\evil.example")).toBe("/");
    expect(safeReturnPath("/%5cevil.example")).toBe("/");
    expect(safeReturnPath("/%2f%2fevil.example")).toBe("/");
  });
});
