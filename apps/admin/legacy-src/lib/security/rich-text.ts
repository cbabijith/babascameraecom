import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p",
  "br",
  "strong",
  "em",
  "s",
  "code",
  "pre",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "h4",
  "hr",
  "a",
] as const;

/**
 * Product copy is rendered on a public page, so the database must never become
 * a storage layer for executable markup. Images are managed through the
 * product-images contract and are intentionally not accepted in rich text.
 */
export function sanitizeProductDescription(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [...allowedTags],
    allowedAttributes: {
      a: ["href", "title", "target"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      a: ["http", "https", "mailto"],
    },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: {
          ...attributes,
          rel: "noopener noreferrer nofollow",
          target: attributes.target === "_blank" ? "_blank" : "_self",
        },
      }),
    },
  }).trim();
}

