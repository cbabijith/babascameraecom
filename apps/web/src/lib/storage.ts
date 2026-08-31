import { resolveMediaUrl } from "@/lib/media-proxy";

export function productImageUrl(path: string | null | undefined): string {
  if (!path) return "/placeholder.svg";
  if (path.startsWith("/")) return path;

  // Private Tigris objects are streamed through the local media proxy.
  const proxied = resolveMediaUrl(path, "");
  if (proxied && proxied !== path) return proxied;
  if (/^https?:\/\//i.test(path)) return path;
  return "/placeholder.svg";
}
