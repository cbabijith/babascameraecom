import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./safe-redirect";

describe("safeInternalPath", () => {
  it("keeps local paths including query strings", () => {
    expect(safeInternalPath("/checkout?from=cart")).toBe(
      "/checkout?from=cart",
    );
  });

  it("rejects absolute, protocol-relative and backslash redirects", () => {
    expect(safeInternalPath("https://evil.test")).toBe("/account");
    expect(safeInternalPath("//evil.test/path")).toBe("/account");
    expect(safeInternalPath("/\\evil.test")).toBe("/account");
  });
});
