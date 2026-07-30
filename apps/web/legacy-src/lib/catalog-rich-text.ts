const DANGEROUS_CONTAINER =
  /<(script|style|svg|iframe|object|embed|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const DANGEROUS_SINGLETON =
  /<(script|style|svg|iframe|object|embed|template|noscript)\b[^>]*\/?>/gi;
const BLOCK_END =
  /<\/(?:p|div|section|article|h[1-6]|blockquote|pre|tr|table|ul|ol)\s*>/gi;
const LIST_START = /<li\b[^>]*>/gi;
const LIST_END = /<\/li\s*>/gi;
const BREAK = /<br\s*\/?>/gi;
const TAG = /<[^>]*>/g;

function decodeTextEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi,
    (match, decimal: string, hexadecimal: string, name: string) => {
      if (decimal) {
        const point = Number(decimal);
        return Number.isSafeInteger(point) && point <= 0x10ffff
          ? String.fromCodePoint(point)
          : "";
      }
      if (hexadecimal) {
        const point = Number.parseInt(hexadecimal, 16);
        return Number.isSafeInteger(point) && point <= 0x10ffff
          ? String.fromCodePoint(point)
          : "";
      }
      return named[name.toLowerCase()] ?? match;
    },
  );
}

/**
 * Catalog prose is rendered as React text, never as HTML. Formatting is
 * reduced to newlines and list bullets so malformed markup remains inert.
 */
export function catalogRichTextToPlainText(value?: string): string {
  if (!value) return "";
  return decodeTextEntities(
    value
      .replace(DANGEROUS_CONTAINER, "")
      .replace(DANGEROUS_SINGLETON, "")
      .replace(BREAK, "\n")
      .replace(LIST_START, "\n• ")
      .replace(LIST_END, "\n")
      .replace(BLOCK_END, "\n")
      .replace(TAG, ""),
  )
    .replace(/\r/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
