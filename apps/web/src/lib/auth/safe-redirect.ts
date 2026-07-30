export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/account",
): string {
  if (!value) return fallback;
  const candidate = value.trim();
  const hasControlCharacter = [...candidate].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    hasControlCharacter
  ) {
    return fallback;
  }
  try {
    const parsed = new URL(candidate, "https://babascamera.invalid");
    if (parsed.origin !== "https://babascamera.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
