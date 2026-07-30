import { describe, expect, test } from "bun:test";

import { sanitizeProductDescription } from "@/lib/security/rich-text";

describe("product description sanitizer", () => {
  test("keeps supported editorial markup and hardens links", () => {
    const result = sanitizeProductDescription(
      '<h2>Lens</h2><p><strong>Fast</strong> glass <a href="https://example.com" target="_blank">guide</a></p>',
    );
    expect(result).toContain("<h2>Lens</h2>");
    expect(result).toContain("<strong>Fast</strong>");
    expect(result).toContain('rel="noopener noreferrer nofollow"');
  });

  test("removes executable, image, event, and unsafe URL content", () => {
    const result = sanitizeProductDescription(
      '<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(2)" onclick="x()">bad</a>',
    );
    expect(result).not.toContain("script");
    expect(result).not.toContain("img");
    expect(result).not.toContain("javascript:");
    expect(result).not.toContain("onclick");
  });
});
