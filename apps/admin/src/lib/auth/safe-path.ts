const localOrigin = "https://admin.invalid";

function containsControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

export function safeReturnPath(value: FormDataEntryValue | string | null) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    containsControlCharacter(value)
  ) {
    return "/dashboard";
  }
  try {
    const parsed = new URL(value, localOrigin);
    const decodedPath = decodeURIComponent(parsed.pathname);
    if (
      parsed.origin !== localOrigin ||
      decodedPath.startsWith("//") ||
      decodedPath.includes("\\")
    ) {
      return "/dashboard";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/dashboard";
  }
}
