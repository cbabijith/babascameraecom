import { describe, expect, it } from "vitest";
import { catalogRichTextToPlainText } from "./catalog-rich-text";

describe("catalog rich text", () => {
  it("preserves readable paragraphs and lists as plain text", () => {
    const text = catalogRichTextToPlainText(
      "<p>Camera &amp; lens</p><ul><li>Fast</li><li>Sharp</li></ul>",
    );
    expect(text).toContain("Camera & lens");
    expect(text).toContain("• Fast");
    expect(text).toContain("• Sharp");
  });

  it("makes unquoted handlers and javascript URLs inert", () => {
    const text = catalogRichTextToPlainText(
      '<img src=x onerror=alert(1)><a href="javascript:alert(2)">Safe label</a>',
    );
    expect(text).toBe("Safe label");
    expect(text).not.toMatch(/onerror|javascript:/i);
  });

  it("removes SVG, iframe, srcdoc, and executable containers", () => {
    const text = catalogRichTextToPlainText(
      '<svg onload=alert(1)><script>alert(2)</script></svg><p>Visible</p><iframe srcdoc="<img src=x onerror=alert(3)>"></iframe>',
    );
    expect(text).toBe("Visible");
    expect(text).not.toMatch(/svg|iframe|srcdoc|alert|onerror/i);
  });
});
