import { describe, expect, it } from "bun:test";

import { sanitizeProductDescription } from "./rich-text";

describe("sanitizeProductDescription", () => {
  it("preserves the supported TipTap document shape", () => {
    expect(
      sanitizeProductDescription(
        '<h2>Highlights</h2><p>A <strong>sharp</strong> lens.</p><ul><li>Fast</li></ul>',
      ),
    ).toBe(
      "<h2>Highlights</h2><p>A <strong>sharp</strong> lens.</p><ul><li>Fast</li></ul>",
    );
  });

  it("removes executable and presentation markup", () => {
    const sanitized = sanitizeProductDescription(
      '<p style="background:url(javascript:alert(1))" onclick="alert(1)">Safe</p>' +
        '<script>alert("xss")</script><img src=x onerror=alert(1)>',
    );

    expect(sanitized).toBe("<p>Safe</p>");
    expect(sanitized).not.toContain("script");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).not.toContain("javascript:");
  });

  it("rejects unsafe link protocols and hardens external links", () => {
    const sanitized = sanitizeProductDescription(
      '<a href="javascript:alert(1)" target="_blank">Bad</a>' +
        '<a href="https://example.com" target="_blank">Good</a>',
    );

    expect(sanitized).toContain("<a target=\"_blank\" rel=\"noopener noreferrer nofollow\">Bad</a>");
    expect(sanitized).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">Good</a>',
    );
  });
});
