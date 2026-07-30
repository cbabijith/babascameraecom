import { describe, expect, it } from "vitest";
import { sanitizeProductDescription } from "./product-description";

describe("product description allowlist", () => {
  it("keeps supported TipTap formatting", () => {
    expect(
      sanitizeProductDescription(
        "<h2>Highlights</h2><p><strong>Fast</strong> autofocus.</p>",
      ),
    ).toBe(
      "<h2>Highlights</h2><p><strong>Fast</strong> autofocus.</p>",
    );
  });

  it("removes script, event, SVG, iframe and srcdoc payloads", () => {
    const result = sanitizeProductDescription(
      '<p onmouseover=alert(1)>Safe</p><script>alert(1)</script><svg onload=alert(1)></svg><iframe srcdoc="<script>alert(1)</script>"></iframe>',
    );
    expect(result).toBe("<p>Safe</p>");
    expect(result).not.toMatch(/script|onmouseover|onload|iframe|srcdoc|svg/i);
  });

  it("drops javascript links and hardens allowed external links", () => {
    const result = sanitizeProductDescription(
      '<a href="javascript:alert(1)">Bad</a><a href="https://example.com">Good</a>',
    );
    expect(result).not.toContain("javascript:");
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('rel="nofollow noopener noreferrer"');
  });
});
