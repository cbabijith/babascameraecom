const localOrigin = "https://admin.invalid";

export function safeReturnPath(value: FormDataEntryValue | string | null) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return "/";
  }

  try {
    const parsed = new URL(value, localOrigin);
    const decodedPath = decodeURIComponent(parsed.pathname);
    if (
      parsed.origin !== localOrigin ||
      decodedPath.startsWith("//") ||
      decodedPath.includes("\\")
    ) {
      return "/";
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
