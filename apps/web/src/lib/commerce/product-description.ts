import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "strong",
  "b",
  "em",
  "i",
  "h2",
  "h3",
  "blockquote",
  "a",
] as const;

export function sanitizeProductDescription(value: string | null): string {
  if (!value) return "";
  return sanitizeHtml(value, {
    allowedTags: [...allowedTags],
    allowedAttributes: {
      a: ["href", "title", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: "a",
        attribs: {
          ...attributes,
          rel: "nofollow noopener noreferrer",
        },
      }),
    },
  });
}
