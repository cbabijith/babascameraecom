import sanitizeHtml from "sanitize-html";

export function sanitizeProductDescription(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [
      "p", "br", "strong", "em", "s", "code", "pre", "blockquote",
      "ul", "ol", "li", "h2", "h3", "h4", "hr", "a",
    ],
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { a: ["http", "https", "mailto"] },
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: {
          ...attributes,
          target: attributes.target === "_blank" ? "_blank" : "_self",
          rel: "noopener noreferrer nofollow",
        },
      }),
    },
  }).trim();
}
