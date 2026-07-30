const FIXED_MEDIA_HOSTS = new Set([
  "babas.blr1.cdn.digitaloceanspaces.com",
  "babasphotostore.blr1.cdn.digitaloceanspaces.com",
]);

function configuredMediaHosts(): Set<string> {
  const hosts = new Set(FIXED_MEDIA_HOSTS);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (supabaseUrl) {
    try {
      hosts.add(new URL(supabaseUrl).hostname.toLowerCase());
    } catch {
      // An invalid deployment setting must not make an unsafe URL public.
    }
  }
  for (const host of (process.env.STOREFRONT_MEDIA_HOSTS ?? "").split(",")) {
    const normalized = host.trim().toLowerCase();
    if (normalized) hosts.add(normalized);
  }
  return hosts;
}

function containsControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function isSafeLocalPath(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !containsControlCharacter(value)
  );
}

export function safeDestinationUrl(value: string | null): string | null {
  if (!value) return null;
  const candidate = value.trim();
  if (isSafeLocalPath(candidate)) return candidate;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function safePublicMediaReference(value: string | null): string | null {
  if (!value) return null;
  const candidate = value.trim();
  if (isSafeLocalPath(candidate)) return candidate;

  // Product records may store an object key rather than a complete URL.
  if (
    !candidate.includes(":") &&
    !candidate.includes("\\") &&
    !candidate.startsWith("//") &&
    !containsControlCharacter(candidate)
  ) {
    return candidate;
  }

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    const approved = configuredMediaHosts().has(hostname) || hostname.endsWith(".supabase.co");
    return url.protocol === "https:" && approved ? url.toString() : null;
  } catch {
    return null;
  }
}
