import { describe, expect, test } from "bun:test";

import { safeReturnPath } from "@/lib/auth/safe-path";

describe("safeReturnPath", () => {
  test("keeps local paths", () => {
    expect(safeReturnPath("/orders?status=pending")).toBe("/orders?status=pending");
  });

  test.each(["https://evil.test", "//evil.test", "/\\evil", "/%2f%2fevil.test", "/ok\u0000bad"])(
    "rejects unsafe return path %s",
    (value) => expect(safeReturnPath(value)).toBe("/dashboard"),
  );
});
