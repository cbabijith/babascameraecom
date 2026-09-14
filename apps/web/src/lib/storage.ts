import { resolveMediaUrl } from "@/lib/media-proxy";

export function productImageUrl(path: string | null | undefined): string {
  if (!path) return "/placeholder.svg";
  if (path === "placeholder.svg" || path === "/placeholder.svg") return "/placeholder.svg";

  // Private Tigris objects are streamed through the local media proxy.
  const proxied = resolveMediaUrl(path, "");
  if (proxied && proxied !== path) return proxied;
  if (path.startsWith("/")) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return proxied || "/placeholder.svg";
}

